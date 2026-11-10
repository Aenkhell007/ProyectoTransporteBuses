BEGIN;
ALTER TABLE transporte.reservas ADD COLUMN edicion_asientos_version integer NOT NULL DEFAULT 1;
ALTER TABLE transporte.pasajeros ADD COLUMN tipo_pasajero text NOT NULL DEFAULT 'ADULTO' CHECK(tipo_pasajero IN('ADULTO','NINO','TERCERA_EDAD','DISCAPACIDAD'));
UPDATE transporte.pasajeros SET tipo_pasajero=beneficio_codigo WHERE beneficio_codigo IS NOT NULL;

CREATE FUNCTION transporte.compra_asientos_editables(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
 SELECT r.estado='PENDIENTE' AND r.expires_at>now()
 AND NOT EXISTS(SELECT 1 FROM transporte.intentos_pago i WHERE i.reserva_id=r.id AND i.estado NOT IN('PENDIENTE','ANULADO'))
 AND NOT EXISTS(SELECT 1 FROM transporte.comprobantes c JOIN transporte.intentos_pago i ON i.id=c.intento_id WHERE i.reserva_id=r.id)
 FROM transporte.reservas r WHERE r.id=p_id
$$;

CREATE OR REPLACE FUNCTION transporte.compra_resumen(p_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE r transporte.reservas; v jsonb; q jsonb;
BEGIN
 r:=transporte.reserva_autorizada(p_id); v:=transporte.compra_viaje_datos(r.viaje_id,r.origen_orden,r.destino_orden);
 SELECT to_jsonb(c)-'cooperativa_id'||jsonb_build_object('moneda','USD','expires_at',r.expires_at,
 'impuesto_bp',coalesce((SELECT cl.impuesto_bp FROM transporte.cotizacion_lineas cl WHERE cl.cotizacion_id=c.id LIMIT 1),0),
 'lineas',coalesce((SELECT jsonb_agg(to_jsonb(l)-'cooperativa_id'||jsonb_build_object('asiento_codigo',pc.codigo,'pasajero',p.nombres||' '||p.apellidos,
 'clase',ca.codigo,'tipo_pasajero',p.tipo_pasajero,'beneficio_codigo',be.codigo,'beneficio_nombre',be.nombre,'descuento_bp',be.descuento_bp,
 'subtotal_neto_centavos',l.base_centavos-l.descuento_centavos+l.servicio_centavos,'total_centavos',l.base_centavos-l.descuento_centavos+l.servicio_centavos+l.iva_centavos) ORDER BY pc.piso,pc.fila,pc.columna)
 FROM transporte.cotizacion_lineas l JOIN transporte.reserva_asientos a ON a.id=l.reserva_asiento_id JOIN transporte.plano_celdas pc ON pc.id=a.asiento_id
 JOIN transporte.clases_asiento ca ON ca.id=pc.clase_id JOIN transporte.pasajeros p ON p.reserva_asiento_id=a.id LEFT JOIN transporte.beneficios be ON be.id=l.beneficio_id WHERE l.cotizacion_id=c.id),'[]'::jsonb))
 INTO q FROM transporte.cotizaciones c WHERE c.reserva_id=r.id AND c.version=r.cotizacion_version;
 RETURN jsonb_build_object('reserva_id',r.id,'estado',CASE WHEN r.estado='PENDIENTE' AND r.expires_at<=now() THEN 'VENCIDA' ELSE r.estado END,
 'expires_at',r.expires_at,'cantidad',r.cantidad,'edicion_asientos_version',r.edicion_asientos_version,'asientos_editables',transporte.compra_asientos_editables(r.id),'viaje',v-'bus'-'mapa','bus',v->'bus','aceptada_version',r.aceptada_version,'cotizacion',q,
 'contacto',CASE WHEN r.contacto_email IS NULL THEN NULL ELSE jsonb_build_object('email',r.contacto_email,'telefono',r.contacto_telefono) END,
 'asientos',(SELECT coalesce(jsonb_agg(jsonb_build_object('reserva_asiento_id',a.id,'asiento_id',pc.id,'codigo',pc.codigo,'piso',pc.piso,'clase',cl.codigo,
 'tarifa_centavos',coalesce((SELECT min(precio_centavos) FROM transporte.tarifas WHERE frecuencia_id=vi.frecuencia_id AND grupo_id=b.grupo_id AND clase_id=cl.id AND origen_orden=r.origen_orden AND destino_orden=r.destino_orden AND activa AND vigencia @> (vi.salida AT TIME ZONE 'America/Guayaquil')::date),0)) ORDER BY pc.piso,pc.fila,pc.columna),'[]'::jsonb)
 FROM transporte.reserva_asientos a JOIN transporte.plano_celdas pc ON pc.id=a.asiento_id JOIN transporte.clases_asiento cl ON cl.id=pc.clase_id
 JOIN transporte.viajes vi ON vi.id=r.viaje_id JOIN transporte.buses b ON b.id=vi.bus_id WHERE a.reserva_id=r.id),
 'pasajeros',(SELECT coalesce(jsonb_agg(to_jsonb(p)-'cooperativa_id' ORDER BY pc.piso,pc.fila,pc.columna),'[]'::jsonb) FROM transporte.pasajeros p JOIN transporte.reserva_asientos a ON a.id=p.reserva_asiento_id JOIN transporte.plano_celdas pc ON pc.id=a.asiento_id WHERE a.reserva_id=r.id));
END $$;

CREATE OR REPLACE FUNCTION transporte.compra_guardar_pasajeros(p_reserva uuid,p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE r transporte.reservas; x jsonb; categoria text; beneficio text;
BEGIN
 r:=transporte.reserva_autorizada(p_reserva); PERFORM 1 FROM transporte.reservas WHERE id=r.id FOR UPDATE;
 r:=transporte.reserva_autorizada(p_reserva);
 IF r.estado<>'PENDIENTE' OR r.expires_at<=now() OR EXISTS(SELECT 1 FROM transporte.intentos_pago WHERE reserva_id=r.id AND estado<>'ANULADO') THEN RAISE EXCEPTION 'Reserva no editable'; END IF;
 IF jsonb_array_length(p->'pasajeros')<>r.cantidad OR(SELECT count(DISTINCT elem->>'reserva_asiento_id') FROM jsonb_array_elements(p->'pasajeros')elem)<>r.cantidad THEN RAISE EXCEPTION 'Complete un pasajero por asiento'; END IF;
 FOR x IN SELECT * FROM jsonb_array_elements(p->'pasajeros') LOOP
  IF NOT EXISTS(SELECT 1 FROM transporte.reserva_asientos WHERE id=(x->>'reserva_asiento_id')::uuid AND reserva_id=r.id) THEN RAISE EXCEPTION 'Asiento ajeno a reserva' USING ERRCODE='42501'; END IF;
  IF length(trim(x->>'nombres')) NOT BETWEEN 1 AND 100 OR length(trim(x->>'apellidos')) NOT BETWEEN 1 AND 100 OR length(trim(x->>'documento')) NOT BETWEEN 1 AND 30 OR x->>'tipo_documento' NOT IN('CEDULA','PASAPORTE','OTRO') THEN RAISE EXCEPTION 'Datos de pasajero invalidos' USING ERRCODE='22023'; END IF;
  IF x->>'respaldo_archivo_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM transporte.archivos WHERE id=(x->>'respaldo_archivo_id')::uuid AND propietario_id=transporte.actor() AND cooperativa_id=r.cooperativa_id AND archivos.categoria='RESPALDO' AND validado_servidor) THEN RAISE EXCEPTION 'Archivo no accesible' USING ERRCODE='42501'; END IF;
  categoria:=coalesce(x->>'tipo_pasajero',x->>'beneficio_codigo','ADULTO');
  IF categoria NOT IN ('ADULTO','NINO','TERCERA_EDAD','DISCAPACIDAD') THEN RAISE EXCEPTION 'Tipo de pasajero invalido' USING ERRCODE='22023'; END IF;
  -- La categoría describe al pasajero; solo una regla vigente autoriza descuento.
  beneficio:=NULL;
  IF categoria<>'ADULTO' AND EXISTS(SELECT 1 FROM transporte.beneficios be JOIN transporte.viajes v ON v.id=r.viaje_id WHERE be.cooperativa_id=r.cooperativa_id AND be.codigo=categoria AND be.activo AND be.vigencia @> (v.salida AT TIME ZONE 'America/Guayaquil')::date) THEN beneficio:=categoria; END IF;
  x:=x||jsonb_build_object('beneficio_codigo',beneficio);
  PERFORM transporte.guardar_pasajero((x->>'reserva_asiento_id')::uuid,jsonb_build_object('nombres',x->>'nombres','apellidos',x->>'apellidos','tipoDocumento',x->>'tipo_documento','documento',x->>'documento','nacimiento',x->>'nacimiento','beneficio',x->>'beneficio_codigo','respaldoArchivoId',x->>'respaldo_archivo_id'));
  UPDATE transporte.pasajeros SET tipo_pasajero=categoria,email=nullif(x->>'email',''),telefono=nullif(x->>'telefono','') WHERE reserva_asiento_id=(x->>'reserva_asiento_id')::uuid;
 END LOOP;
 UPDATE transporte.reservas SET contacto_email=p->'contacto'->>'email',contacto_telefono=p->'contacto'->>'telefono',aceptada_version=NULL WHERE id=r.id;
 RETURN transporte.compra_resumen(r.id)->'pasajeros';
END $$;


CREATE FUNCTION transporte.compra_cambiar_asientos(p_id uuid,p_version integer,p_asientos uuid[]) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE r transporte.reservas; v transporte.viajes; anteriores uuid[]; nuevos uuid[]; quitados uuid[]; i integer;
BEGIN
 r:=transporte.reserva_autorizada(p_id);
 -- Mismo orden que reservar_asientos: viaje antes que reservas, también al expirar.
 SELECT * INTO v FROM transporte.viajes WHERE id=r.viaje_id FOR UPDATE;
 PERFORM transporte.expirar_reservas(v.id);
 PERFORM 1 FROM transporte.reservas WHERE id=p_id FOR UPDATE;
 r:=transporte.reserva_autorizada(p_id);
 IF r.cliente_id IS DISTINCT FROM transporte.actor() THEN RAISE EXCEPTION 'Reserva no disponible' USING ERRCODE='42501'; END IF;
 IF NOT transporte.compra_asientos_editables(r.id) OR v.estado<>'PUBLICADO' OR v.salida<=now() THEN RAISE EXCEPTION 'Reserva no editable'; END IF;
 IF p_version IS NULL OR p_version<>r.edicion_asientos_version THEN RAISE EXCEPTION 'Otra pestaña modifico los asientos'; END IF;
 IF p_asientos IS NULL OR cardinality(p_asientos)<>r.cantidad OR (SELECT count(DISTINCT a) FROM unnest(p_asientos) a)<>r.cantidad THEN RAISE EXCEPTION 'Cantidad de asientos incorrecta' USING ERRCODE='22023'; END IF;
 IF (SELECT count(*) FROM transporte.plano_celdas pc WHERE pc.id=ANY(p_asientos) AND pc.plano_id=v.plano_id AND pc.tipo='ASIENTO' AND pc.activa)<>r.cantidad THEN RAISE EXCEPTION 'Asientos no disponibles' USING ERRCODE='22023'; END IF;
 SELECT array_agg(a.asiento_id ORDER BY a.id) INTO anteriores FROM transporte.reserva_asientos a WHERE a.reserva_id=r.id AND a.estado='RETENIDO';
 IF cardinality(anteriores) IS DISTINCT FROM r.cantidad THEN RAISE EXCEPTION 'Retencion no vigente'; END IF;
 IF anteriores @> p_asientos AND anteriores <@ p_asientos THEN RETURN transporte.compra_resumen(r.id); END IF;
 SELECT array_agg(a.id ORDER BY a.id) INTO quitados FROM transporte.reserva_asientos a WHERE a.reserva_id=r.id AND NOT(a.asiento_id=ANY(p_asientos));
 SELECT array_agg(a ORDER BY orden) INTO nuevos FROM unnest(p_asientos) WITH ORDINALITY AS t(a,orden) WHERE NOT(a=ANY(anteriores));
 -- Se conservan los IDs de las fichas y de los asientos que no cambian.
 -- Si un destino está ocupado, la exclusión revierte toda la operación.
 UPDATE transporte.reserva_asientos SET estado='LIBERADO' WHERE id=ANY(quitados);
 FOR i IN 1..cardinality(quitados) LOOP
  UPDATE transporte.reserva_asientos SET asiento_id=nuevos[i],estado='RETENIDO' WHERE id=quitados[i];
 END LOOP;
 UPDATE transporte.intentos_pago SET estado='ANULADO' WHERE reserva_id=r.id AND estado='PENDIENTE';
 UPDATE transporte.reservas SET edicion_asientos_version=edicion_asientos_version+1,cotizacion_version=0,aceptada_version=NULL,total_centavos=0 WHERE id=r.id;
 INSERT INTO transporte.auditoria(actor_id,cooperativa_id,entidad,entidad_id,accion,datos) VALUES(transporte.actor(),r.cooperativa_id,'reservas',r.id,'CAMBIAR_ASIENTOS',jsonb_build_object('anteriores',anteriores,'nuevos',p_asientos));
 RETURN transporte.compra_resumen(r.id);
END $$;
REVOKE ALL ON FUNCTION transporte.compra_asientos_editables(uuid),transporte.compra_cambiar_asientos(uuid,integer,uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.compra_cambiar_asientos(uuid,integer,uuid[]) TO transporte_runtime;
CREATE OR REPLACE FUNCTION transporte.consultar_pago_cliente(p_reserva uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE r transporte.reservas; resultado jsonb;
BEGIN
 r:=transporte.reserva_autorizada(p_reserva);
 SELECT jsonb_build_object(
  'reserva',jsonb_build_object('id',r.id,'estado',r.estado,'expires_at',r.expires_at,'cantidad',r.cantidad,
    'total_centavos',r.total_centavos,'cotizacion_version',r.cotizacion_version,'aceptada_version',r.aceptada_version),
  'viaje',(SELECT jsonb_build_object('salida',v.salida+(po.minutos_desde_origen*interval '1 minute'),
    'llegada',v.salida+(pd.minutos_desde_origen*interval '1 minute'),'origen',co.nombre,'destino',cd.nombre,
    'terminalOrigen',tor.nombre,'terminalDestino',tde.nombre,'cooperativa',c.nombre,'unidad',b.unidad,
    'placa',b.placa,'chasis',b.chasis,'carroceria',b.carroceria,'servicio',g.nombre,'pisos',pl.pisos)
    FROM transporte.viajes v JOIN transporte.frecuencias f ON f.id=v.frecuencia_id
    JOIN transporte.ruta_paradas po ON po.ruta_id=f.ruta_id AND po.orden=r.origen_orden
    JOIN transporte.ruta_paradas pd ON pd.ruta_id=f.ruta_id AND pd.orden=r.destino_orden
    JOIN transporte.terminales tor ON tor.id=po.terminal_id JOIN transporte.ciudades co ON co.id=tor.ciudad_id
    JOIN transporte.terminales tde ON tde.id=pd.terminal_id JOIN transporte.ciudades cd ON cd.id=tde.ciudad_id
    JOIN transporte.cooperativas c ON c.id=v.cooperativa_id JOIN transporte.buses b ON b.id=v.bus_id
    JOIN transporte.grupos_bus g ON g.id=b.grupo_id JOIN transporte.planos pl ON pl.id=v.plano_id WHERE v.id=r.viaje_id),
  'cotizacion',(SELECT to_jsonb(q)-'cooperativa_id' FROM transporte.cotizaciones q
    WHERE q.reserva_id=r.id AND q.version=coalesce(r.aceptada_version,r.cotizacion_version)),
  'pasajeros',coalesce((SELECT jsonb_agg(jsonb_build_object('nombre',p.nombres||' '||p.apellidos,
    'documento',p.documento,'categoria',CASE p.tipo_pasajero WHEN 'NINO' THEN 'Niño' WHEN 'TERCERA_EDAD' THEN 'Tercera edad' WHEN 'DISCAPACIDAD' THEN 'Persona con discapacidad' ELSE 'Adulto' END,'asiento',pc.codigo,'piso',pc.piso,
    'tarifaCentavos',cl.base_centavos,'descuentoCentavos',cl.descuento_centavos,'servicioCentavos',cl.servicio_centavos,
    'ivaCentavos',cl.iva_centavos,'impuestoBp',cl.impuesto_bp) ORDER BY pc.piso,pc.fila,pc.columna)
    FROM transporte.reserva_asientos a JOIN transporte.plano_celdas pc ON pc.id=a.asiento_id
    JOIN transporte.pasajeros p ON p.reserva_asiento_id=a.id
    LEFT JOIN transporte.cotizaciones q ON q.reserva_id=r.id AND q.version=coalesce(r.aceptada_version,r.cotizacion_version)
    LEFT JOIN transporte.cotizacion_lineas cl ON cl.cotizacion_id=q.id AND cl.reserva_asiento_id=a.id
    LEFT JOIN transporte.beneficios be ON be.id=cl.beneficio_id WHERE a.reserva_id=r.id),'[]'::jsonb),
  'cuentas',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'banco',b.nombre,'tipo',a.tipo,'numero',a.numero,
    'titular',a.titular,'ruc',a.documento_titular,'qrArchivoId',a.qr_archivo_id) ORDER BY b.nombre,a.id)
    FROM transporte.cuentas_bancarias a JOIN transporte.bancos b ON b.id=a.banco_id
    WHERE a.cooperativa_id=r.cooperativa_id AND a.activa AND b.activo),'[]'::jsonb),
  'metodos',coalesce((SELECT jsonb_agg(jsonb_build_object('id',m.codigo,'nombre',m.nombre,'tipo',m.tipo,
    'habilitado',cfg.habilitado AND m.adaptador_disponible AND m.codigo='BANCO','instrucciones',cfg.instrucciones)
    ORDER BY m.nombre) FROM transporte.cooperativa_metodos_pago cfg JOIN transporte.metodos_pago m ON m.id=cfg.metodo_id
    WHERE cfg.cooperativa_id=r.cooperativa_id),'[]'::jsonb),
  'politica',(SELECT jsonb_build_object('maxBytes',p.max_bytes,'mimes',p.mimes,'referenciaObligatoria',p.referencia_obligatoria)
    FROM transporte.politica_comprobantes p WHERE p.cooperativa_id=r.cooperativa_id),
  'intento',(SELECT jsonb_build_object('id',i.id,'estado',i.estado,'cuentaId',i.cuenta_id,'cuentaSnapshot',i.cuenta_snapshot,
    'metodo',m.nombre,'totalCentavos',i.total_centavos) FROM transporte.intentos_pago i JOIN transporte.metodos_pago m ON m.id=i.metodo_id
    WHERE i.reserva_id=r.id ORDER BY (i.estado IN('PENDIENTE','EN_REVISION','APROBADO')) DESC,i.created_at DESC,i.id DESC LIMIT 1),
  'comprobante',(SELECT jsonb_build_object('id',c.id,'estado',c.estado,'motivo',c.motivo,'referencia',c.referencia,
    'archivoId',a.id,'bytes',a.bytes,'mime',a.mime,'nombre',regexp_replace(a.ruta_privada,'^.*/',''),'version',c.version)
    FROM transporte.comprobantes c JOIN transporte.intentos_pago i ON i.id=c.intento_id JOIN transporte.archivos a ON a.id=c.archivo_id
    WHERE i.reserva_id=r.id ORDER BY (i.estado IN('PENDIENTE','EN_REVISION','APROBADO')) DESC,i.created_at DESC,i.id DESC LIMIT 1),
  'compra',(SELECT jsonb_build_object('id',c.id,'codigo',c.codigo,'estado',c.estado,'totalPagadoCentavos',c.total_pagado_centavos,
    'viajeSnapshot',c.viaje_snapshot) FROM transporte.compras c WHERE c.reserva_id=r.id),
  'documento',(SELECT jsonb_build_object('id',b.id,'qrId',b.qr_id,'estado',b.estado,'archivoId',b.archivo_id)
    FROM transporte.boletos b JOIN transporte.compras c ON c.id=b.compra_id WHERE c.reserva_id=r.id)
 ) INTO resultado;
 RETURN resultado;
END $$;
COMMIT;
