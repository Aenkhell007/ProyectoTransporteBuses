-- DATOS DE PRUEBA PERSISTENTES, NO PAGOS REALES.
-- Ejecutar en Supabase SQL Editor como postgres, después de las migraciones.
-- Usa Gran Continental / Matriz Ambato y el oficinista ya registrado.
-- No cambia usuarios, contraseñas ni permisos; no envía mensajes.
-- Repetir el mismo día conserva las reservas creadas y sus decisiones.
-- Crea dos buses exclusivos DEMO, viajes para mañana y cuatro reservas.
-- Si falta una política PUBLICADA, se detiene sin guardar nada.
BEGIN;
DO $datos$
DECLARE
  v_coop uuid; v_oficina uuid; v_usuario uuid; v_politica uuid;
  v_origen uuid; v_destino uuid; v_t1 uuid; v_t2 uuid; v_ruta uuid;
  v_grupo uuid; v_bus uuid; v_plano uuid; v_frecuencia uuid; v_viaje uuid;
  v_normal uuid; v_vip uuid; v_impuesto uuid; v_cuenta uuid; v_banco uuid;
  v_reserva uuid; v_asiento uuid; v_ra uuid; v_compra uuid;
  v_dia date := (now() AT TIME ZONE 'America/Guayaquil')::date + 1;
  v_salida timestamptz; v_clave text; v_email text; v_version integer;
  v_tipo integer; v_i integer; v_fila integer; v_col integer; v_piso integer;
  v_codigo text; v_clase uuid; v_precio bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('demo-oficina-gran-continental'));
  SELECT c.id INTO STRICT v_coop FROM transporte.cooperativas c
    WHERE c.ruc='1805381579001' AND c.activa;
  SELECT o.id INTO STRICT v_oficina FROM transporte.oficinas o
    WHERE o.cooperativa_id=v_coop AND o.nombre='Oficina Matriz Ambato' AND o.activa;
  SELECT u.id INTO STRICT v_usuario FROM transporte.usuarios u
    WHERE lower(u.email)='manuelyepez770@gmail.com' AND u.activo;
  -- Contexto únicamente de esta transacción administrativa, sin crear sesiones.
  PERFORM set_config('app.usuario_id',v_usuario::text,true);
  IF NOT transporte.puede('oficina.vender',v_coop,v_oficina)
     OR NOT transporte.puede('reembolsos.gestionar',v_coop,v_oficina) THEN
    RAISE EXCEPTION 'El usuario debe tener membresía OFICINISTA activa en Matriz Ambato.';
  END IF;
  SELECT p.id INTO v_politica FROM transporte.politicas_reembolso p
    WHERE p.cooperativa_id=v_coop AND p.estado='PUBLICADA';
  IF v_politica IS NULL THEN
    RAISE EXCEPTION 'Falta una política de reembolso PUBLICADA para Gran Continental. Configúrela y publique sus reglas antes de ejecutar este script. No se inventan porcentajes.';
  END IF;
  SELECT c.id INTO STRICT v_normal FROM transporte.clases_asiento c WHERE c.codigo='NORMAL';
  SELECT c.id INTO STRICT v_vip FROM transporte.clases_asiento c WHERE c.codigo='VIP';
  SELECT i.id INTO STRICT v_impuesto FROM transporte.impuestos i WHERE i.codigo='IVA0_TRANSPORTE';
  SELECT c.id INTO STRICT v_origen FROM transporte.ciudades c WHERE c.nombre='Ambato' AND c.provincia='Tungurahua';
  SELECT c.id INTO STRICT v_destino FROM transporte.ciudades c WHERE c.nombre='Quito' AND c.provincia='Pichincha';
  SELECT t.id INTO v_t1 FROM transporte.terminales t WHERE t.ciudad_id=v_origen AND t.nombre='DEMO Oficina Ambato';
  IF v_t1 IS NULL THEN INSERT INTO transporte.terminales(ciudad_id,nombre) VALUES(v_origen,'DEMO Oficina Ambato') RETURNING id INTO v_t1; END IF;
  SELECT t.id INTO v_t2 FROM transporte.terminales t WHERE t.ciudad_id=v_destino AND t.nombre='DEMO Oficina Quito';
  IF v_t2 IS NULL THEN INSERT INTO transporte.terminales(ciudad_id,nombre) VALUES(v_destino,'DEMO Oficina Quito') RETURNING id INTO v_t2; END IF;
  SELECT r.id INTO v_ruta FROM transporte.rutas r WHERE r.cooperativa_id=v_coop AND r.nombre='DEMO Oficina Ambato - Quito';
  IF v_ruta IS NULL THEN
    INSERT INTO transporte.rutas(cooperativa_id,nombre) VALUES(v_coop,'DEMO Oficina Ambato - Quito') RETURNING id INTO v_ruta;
    INSERT INTO transporte.ruta_paradas(cooperativa_id,ruta_id,terminal_id,orden,minutos_desde_origen)
      VALUES(v_coop,v_ruta,v_t1,1,0),(v_coop,v_ruta,v_t2,2,180);
  END IF;
  -- Habilita solo los métodos manuales existentes; no habilita pasarelas.
  INSERT INTO transporte.cooperativa_metodos_pago(cooperativa_id,metodo_id,habilitado)
    SELECT v_coop,m.id,true FROM transporte.metodos_pago m WHERE m.codigo IN('EFECTIVO','BANCO')
    ON CONFLICT(cooperativa_id,metodo_id) DO NOTHING;
  IF EXISTS(SELECT 1 FROM transporte.cooperativa_metodos_pago cm JOIN transporte.metodos_pago m ON m.id=cm.metodo_id
    WHERE cm.cooperativa_id=v_coop AND m.codigo IN('EFECTIVO','BANCO') AND NOT cm.habilitado) THEN
    RAISE EXCEPTION 'Habilite Efectivo y Transferencia en la configuración; el script no sobrescribe su configuración.';
  END IF;
  SELECT b.id INTO STRICT v_banco FROM transporte.bancos b WHERE b.codigo='PICHINCHA';
  INSERT INTO transporte.cuentas_bancarias(cooperativa_id,banco_id,tipo,numero,titular,documento_titular,alias,activa)
    VALUES(v_coop,v_banco,'CORRIENTE','DEMO-NO-TRANSFERIR','PRUEBA: NO REALIZAR PAGOS','DEMO','DEMO oficina',true)
    ON CONFLICT(cooperativa_id,banco_id,tipo,numero) DO NOTHING;
  SELECT c.id INTO STRICT v_cuenta FROM transporte.cuentas_bancarias c
    WHERE c.cooperativa_id=v_coop AND c.banco_id=v_banco AND c.tipo='CORRIENTE' AND c.numero='DEMO-NO-TRANSFERIR';
  INSERT INTO transporte.politica_comprobantes(cooperativa_id,referencia_obligatoria)
    VALUES(v_coop,true) ON CONFLICT(cooperativa_id) DO NOTHING;
  FOR v_tipo IN 1..2 LOOP
    v_clase:=CASE WHEN v_tipo=1 THEN v_normal ELSE v_vip END;
    v_precio:=CASE WHEN v_tipo=1 THEN 1200 ELSE 1800 END;
    v_codigo:=CASE WHEN v_tipo=1 THEN 'NORMAL' ELSE 'VIP' END;
    SELECT g.id INTO v_grupo FROM transporte.grupos_bus g WHERE g.cooperativa_id=v_coop AND g.nombre='DEMO Oficina '||v_codigo;
    IF v_grupo IS NULL THEN INSERT INTO transporte.grupos_bus(cooperativa_id,nombre) VALUES(v_coop,'DEMO Oficina '||v_codigo) RETURNING id INTO v_grupo; END IF;
    SELECT b.id INTO v_bus FROM transporte.buses b WHERE b.cooperativa_id=v_coop AND b.unidad='DEMO-OF-'||v_codigo;
    IF v_bus IS NULL THEN
      INSERT INTO transporte.buses(cooperativa_id,grupo_id,unidad,placa,chasis,carroceria)
        VALUES(v_coop,v_grupo,'DEMO-OF-'||v_codigo,'DEMO-OF-'||v_codigo,'Scania (demostración)',
        CASE WHEN v_tipo=1 THEN 'Marcopolo un piso (demostración)' ELSE 'Marcopolo dos pisos (demostración)' END) RETURNING id INTO v_bus;
      INSERT INTO transporte.planos(cooperativa_id,bus_id,numero_version,nombre,pisos)
        VALUES(v_coop,v_bus,1,'DEMO Oficina '||v_codigo,v_tipo) RETURNING id INTO v_plano;
      FOR v_piso IN 1..v_tipo LOOP
        FOR v_fila IN 1..(CASE WHEN v_tipo=1 THEN 10 ELSE 6 END) LOOP
          FOR v_col IN 1..(CASE WHEN v_tipo=1 THEN 5 ELSE 4 END) LOOP
            IF v_col=(CASE WHEN v_tipo=1 THEN 3 ELSE 2 END) THEN
              INSERT INTO transporte.plano_celdas(cooperativa_id,plano_id,piso,fila,columna,tipo)
                VALUES(v_coop,v_plano,v_piso,v_fila,v_col,'PASILLO');
            ELSE
              INSERT INTO transporte.plano_celdas(cooperativa_id,plano_id,piso,fila,columna,tipo,codigo,clase_id)
                VALUES(v_coop,v_plano,v_piso,v_fila,v_col,'ASIENTO',
                CASE WHEN v_tipo=1 THEN v_fila::text||CASE v_col WHEN 1 THEN 'A' WHEN 2 THEN 'B' WHEN 4 THEN 'C' ELSE 'D' END
                  ELSE CASE WHEN v_piso=1 THEN 'L' ELSE 'U' END||((v_fila-1)*3+CASE v_col WHEN 1 THEN 1 WHEN 3 THEN 2 ELSE 3 END)::text END,v_clase);
            END IF;
          END LOOP;
        END LOOP;
      END LOOP;
      UPDATE transporte.planos SET publicado=true WHERE id=v_plano;
    ELSE SELECT p.id INTO STRICT v_plano FROM transporte.planos p WHERE p.bus_id=v_bus AND p.numero_version=1;
    END IF;
    SELECT f.id INTO v_frecuencia FROM transporte.frecuencias f WHERE f.cooperativa_id=v_coop AND f.codigo='DEMO-OF-'||v_codigo;
    IF v_frecuencia IS NULL THEN
      INSERT INTO transporte.frecuencias(cooperativa_id,ruta_id,codigo,hora_salida,resolucion_ant,tipo_viaje)
        VALUES(v_coop,v_ruta,'DEMO-OF-'||v_codigo,CASE WHEN v_tipo=1 THEN time '08:00' ELSE time '10:00' END,'DEMO SIN AUTORIZACION COMERCIAL','DIRECTO') RETURNING id INTO v_frecuencia;
      INSERT INTO transporte.frecuencia_grupo(cooperativa_id,frecuencia_id,grupo_id) VALUES(v_coop,v_frecuencia,v_grupo);
      INSERT INTO transporte.tarifas(cooperativa_id,frecuencia_id,grupo_id,clase_id,origen_orden,destino_orden,precio_centavos,impuesto_id,vigencia)
        VALUES(v_coop,v_frecuencia,v_grupo,v_clase,1,2,v_precio,v_impuesto,daterange(v_dia,NULL,'[)'));
    END IF;
    v_salida:=(v_dia+CASE WHEN v_tipo=1 THEN time '08:00' ELSE time '10:00' END) AT TIME ZONE 'America/Guayaquil';
    SELECT v.id INTO v_viaje FROM transporte.viajes v WHERE v.bus_id=v_bus AND v.salida=v_salida;
    IF v_viaje IS NULL THEN
      INSERT INTO transporte.viajes(cooperativa_id,frecuencia_id,bus_id,plano_id,salida,llegada,liberacion_bus,estado)
        VALUES(v_coop,v_frecuencia,v_bus,v_plano,v_salida,v_salida+interval '3 hours',v_salida+interval '4 hours','PUBLICADO') RETURNING id INTO v_viaje;
    END IF;
    IF v_tipo=1 THEN
      FOR v_i IN 1..4 LOOP
        v_email:='demo-oficina-'||v_i||'-'||v_dia::text||'@example.invalid';
        SELECT r.id INTO v_reserva FROM transporte.reservas r WHERE r.viaje_id=v_viaje AND r.contacto_email=v_email;
        IF v_reserva IS NOT NULL THEN CONTINUE; END IF;
        SELECT pc.id INTO STRICT v_asiento FROM transporte.plano_celdas pc WHERE pc.plano_id=v_plano
          AND pc.codigo=CASE v_i WHEN 1 THEN '1A' WHEN 2 THEN '1B' WHEN 3 THEN '1C' ELSE '1D' END;
        v_reserva:=transporte.reservar_asientos(v_viaje,1,2,ARRAY[v_asiento],v_usuario,v_oficina);
        UPDATE transporte.reservas SET contacto_email=v_email WHERE id=v_reserva;
        SELECT a.id INTO STRICT v_ra FROM transporte.reserva_asientos a WHERE a.reserva_id=v_reserva;
        PERFORM transporte.guardar_pasajero(v_ra,jsonb_build_object('nombres','Prueba '||v_i,'apellidos','Oficina DEMO',
          'tipoDocumento','OTRO','documento','DEMO-OF-'||v_i,'nacimiento','1990-01-01'));
        PERFORM transporte.cotizar(v_reserva);
        SELECT r.cotizacion_version INTO v_version FROM transporte.reservas r WHERE r.id=v_reserva;
        PERFORM transporte.aceptar_cotizacion(v_reserva,v_version);
        v_clave:='demo-oficina-'||v_i||'-'||v_dia::text;
        IF v_i=2 THEN
          PERFORM transporte.crear_intento_pago(v_reserva,'BANCO',v_cuenta,v_clave);
        ELSIF v_i IN(3,4) THEN
          v_compra:=transporte.cobrar_efectivo(v_reserva,2000,v_clave);
          IF v_i=4 THEN PERFORM transporte.solicitar_reembolso(v_compra,'PRUEBA de revisión de reembolso; no ejecutar transferencia real.',v_clave||'-reembolso'); END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END $datos$;
-- Guarda los IDs para abrir cada reserva y completar las pruebas.
SELECT r.id AS reserva_id,r.estado,r.contacto_email,v.salida,
  c.id AS compra_id,c.codigo AS codigo_compra,s.id AS solicitud_reembolso_id
FROM transporte.reservas r JOIN transporte.viajes v ON v.id=r.viaje_id
LEFT JOIN transporte.compras c ON c.reserva_id=r.id
LEFT JOIN transporte.solicitudes_reembolso s ON s.compra_id=c.id
WHERE r.contacto_email LIKE 'demo-oficina-%@example.invalid'
ORDER BY r.created_at,r.contacto_email;
COMMIT;
