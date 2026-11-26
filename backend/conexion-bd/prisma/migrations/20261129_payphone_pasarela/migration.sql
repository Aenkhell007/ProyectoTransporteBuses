BEGIN;

-- 1. Habilitar el adaptador PayPhone en el catálogo y en las cooperativas existentes
UPDATE transporte.metodos_pago
SET adaptador_disponible = true, updated_at = now()
WHERE codigo = 'PAYPHONE';

INSERT INTO transporte.cooperativa_metodos_pago (cooperativa_id, metodo_id, habilitado, instrucciones)
SELECT c.id, m.id, true, 'Pago en línea inmediato mediante PayPhone (tarjeta o app PayPhone).'
FROM transporte.cooperativas c
CROSS JOIN transporte.metodos_pago m
WHERE m.codigo = 'PAYPHONE'
ON CONFLICT (cooperativa_id, metodo_id) DO UPDATE
  SET habilitado = true,
      instrucciones = COALESCE(NULLIF(transporte.cooperativa_metodos_pago.instrucciones, ''), excluded.instrucciones),
      updated_at = now();

-- 2. Permitir creación de intentos PayPhone y anular intentos pendientes sin comprobante al cambiar entre PayPhone y Transferencia
CREATE OR REPLACE FUNCTION transporte.crear_intento_pago(p_reserva uuid, p_metodo text, p_cuenta uuid, p_clave text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE
  r transporte.reservas;
  m transporte.metodos_pago;
  cfg transporte.cooperativa_metodos_pago;
  cuenta transporte.cuentas_bancarias;
  anterior transporte.intentos_pago;
  iid uuid;
BEGIN
  r := transporte.reserva_autorizada(p_reserva);
  PERFORM 1 FROM transporte.reservas WHERE id = r.id FOR UPDATE;
  SELECT * INTO anterior FROM transporte.intentos_pago WHERE actor_id = transporte.actor() AND clave_intento = p_clave;
  SELECT * INTO m FROM transporte.metodos_pago WHERE codigo = p_metodo;
  IF anterior.id IS NOT NULL THEN
    IF anterior.reserva_id <> r.id OR anterior.metodo_id IS DISTINCT FROM m.id OR anterior.cuenta_id IS DISTINCT FROM p_cuenta THEN
      RAISE EXCEPTION 'Clave reutilizada con otro contenido';
    END IF;
    RETURN anterior.id;
  END IF;
  IF r.estado <> 'PENDIENTE' OR r.expires_at <= now() OR r.aceptada_version IS DISTINCT FROM r.cotizacion_version OR r.cotizacion_version < 1 OR length(trim(coalesce(p_clave, ''))) = 0 THEN
    RAISE EXCEPTION 'Reserva/cotizacion/clave no valida';
  END IF;
  SELECT * INTO cfg FROM transporte.cooperativa_metodos_pago WHERE cooperativa_id = r.cooperativa_id AND metodo_id = m.id;
  IF cfg.id IS NULL OR NOT cfg.habilitado OR NOT m.adaptador_disponible THEN
    RAISE EXCEPTION 'Metodo no habilitado o sin adaptador';
  END IF;
  IF m.tipo = 'PASARELA' AND m.codigo <> 'PAYPHONE' THEN
    RAISE EXCEPTION 'Adaptador de pasarela no implementado en este paquete SQL';
  END IF;
  IF p_metodo = 'EFECTIVO' THEN
    PERFORM transporte.exigir('oficina.vender', r.cooperativa_id, r.oficina_id);
  END IF;
  IF p_metodo = 'BANCO' THEN
    SELECT * INTO cuenta FROM transporte.cuentas_bancarias WHERE id = p_cuenta AND cooperativa_id = r.cooperativa_id AND activa;
    IF cuenta.id IS NULL THEN
      RAISE EXCEPTION 'Cuenta receptora no valida';
    END IF;
  ELSIF p_cuenta IS NOT NULL THEN
    RAISE EXCEPTION 'Este metodo no recibe cuenta bancaria';
  END IF;

  UPDATE transporte.intentos_pago i
  SET estado = 'ANULADO', updated_at = now()
  WHERE i.reserva_id = r.id
    AND i.estado = 'PENDIENTE'
    AND NOT EXISTS (SELECT 1 FROM transporte.comprobantes c WHERE c.intento_id = i.id)
    AND (
      p_metodo = 'PAYPHONE'
      OR EXISTS (SELECT 1 FROM transporte.metodos_pago pm WHERE pm.id = i.metodo_id AND pm.codigo = 'PAYPHONE')
    );

  INSERT INTO transporte.intentos_pago (cooperativa_id, reserva_id, actor_id, metodo_id, cuenta_id, cuenta_snapshot, clave_intento, total_centavos, cotizacion_version)
  VALUES (
    r.cooperativa_id,
    r.id,
    transporte.actor(),
    m.id,
    cuenta.id,
    CASE WHEN cuenta.id IS NULL THEN NULL ELSE to_jsonb(cuenta) - 'created_at' - 'updated_at' END,
    p_clave,
    r.total_centavos,
    r.cotizacion_version
  )
  RETURNING id INTO iid;
  RETURN iid;
END $$;

-- 3. Funciones SECURITY DEFINER dedicadas para flujo PayPhone (sin exponer confirmar_compra_interna)
CREATE OR REPLACE FUNCTION transporte.registrar_orden_payphone(p_intento uuid, p_client_tx_id text, p_payment_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE
  i transporte.intentos_pago;
  m_codigo text;
  tx text := trim(coalesce(p_client_tx_id, ''));
  pid text := nullif(trim(coalesce(p_payment_id, '')), '');
BEGIN
  SELECT * INTO i FROM transporte.intentos_pago WHERE id = p_intento FOR UPDATE;
  IF i.id IS NULL THEN
    RAISE EXCEPTION 'Intento no encontrado';
  END IF;
  PERFORM transporte.reserva_autorizada(i.reserva_id);
  SELECT codigo INTO m_codigo FROM transporte.metodos_pago WHERE id = i.metodo_id;
  IF m_codigo <> 'PAYPHONE' OR i.estado <> 'PENDIENTE' THEN
    RAISE EXCEPTION 'Intento no valido para PayPhone';
  END IF;
  IF length(tx) = 0 OR length(tx) > 50 THEN
    RAISE EXCEPTION 'Identificador de transaccion PayPhone invalido';
  END IF;
  UPDATE transporte.intentos_pago
  SET proveedor_orden = tx,
      cuenta_snapshot = jsonb_build_object('proveedor', 'PAYPHONE', 'clientTransactionId', tx, 'paymentId', pid),
      updated_at = now()
  WHERE id = i.id;
END $$;

CREATE OR REPLACE FUNCTION transporte.buscar_intento_payphone(p_client_tx_id text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE
  i transporte.intentos_pago;
  tx text := trim(coalesce(p_client_tx_id, ''));
  cid uuid;
BEGIN
  IF length(tx) = 0 OR length(tx) > 50 THEN
    RETURN NULL;
  END IF;
  SELECT i2.* INTO i
  FROM transporte.intentos_pago i2
  JOIN transporte.metodos_pago m ON m.id = i2.metodo_id
  WHERE m.codigo = 'PAYPHONE' AND i2.proveedor_orden = tx AND i2.actor_id = transporte.actor()
  ORDER BY i2.created_at DESC
  LIMIT 1;
  IF i.id IS NULL THEN
    RETURN NULL;
  END IF;
  PERFORM transporte.reserva_autorizada(i.reserva_id);
  SELECT id INTO cid FROM transporte.compras WHERE reserva_id = i.reserva_id;
  RETURN jsonb_build_object(
    'intentoId', i.id,
    'reservaId', i.reserva_id,
    'estado', i.estado,
    'totalCentavos', i.total_centavos,
    'compraId', cid
  );
END $$;

CREATE OR REPLACE FUNCTION transporte.confirmar_pago_payphone(p_reserva uuid, p_client_tx_id text, p_referencia_externa text, p_monto_centavos bigint)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE
  r transporte.reservas;
  i transporte.intentos_pago;
  cid uuid;
  tx text := trim(coalesce(p_client_tx_id, ''));
BEGIN
  r := transporte.reserva_autorizada(p_reserva);
  PERFORM 1 FROM transporte.viajes WHERE id = r.viaje_id FOR UPDATE;
  PERFORM 1 FROM transporte.reservas WHERE id = r.id FOR UPDATE;
  SELECT i2.* INTO i
  FROM transporte.intentos_pago i2
  JOIN transporte.metodos_pago m ON m.id = i2.metodo_id
  WHERE i2.reserva_id = r.id AND m.codigo = 'PAYPHONE' AND i2.proveedor_orden = tx
  FOR UPDATE OF i2;
  IF i.id IS NULL THEN
    RAISE EXCEPTION 'Intento PayPhone no encontrado';
  END IF;
  IF i.estado = 'APROBADO' THEN
    SELECT id INTO cid FROM transporte.compras WHERE reserva_id = r.id;
    IF cid IS NULL THEN
      RAISE EXCEPTION 'Compra confirmada no encontrada';
    END IF;
    RETURN cid;
  END IF;
  IF i.estado <> 'PENDIENTE' THEN
    RAISE EXCEPTION 'El intento PayPhone no esta pendiente';
  END IF;
  IF p_monto_centavos IS NULL OR p_monto_centavos <> i.total_centavos THEN
    RAISE EXCEPTION 'Monto PayPhone no coincide con la reserva';
  END IF;
  cid := transporte.confirmar_compra_interna(i.id);
  UPDATE transporte.pagos
  SET referencia_externa = nullif(trim(coalesce(p_referencia_externa, '')), ''),
      updated_at = now()
  WHERE intento_id = i.id;
  RETURN cid;
END $$;

CREATE OR REPLACE FUNCTION transporte.anular_intento_payphone(p_reserva uuid, p_client_tx_id text, p_motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE
  r transporte.reservas;
  tx text := trim(coalesce(p_client_tx_id, ''));
  mot text := nullif(left(trim(coalesce(p_motivo, '')), 200), '');
BEGIN
  r := transporte.reserva_autorizada(p_reserva);
  UPDATE transporte.intentos_pago i
  SET estado = 'ANULADO',
      cuenta_snapshot = coalesce(i.cuenta_snapshot, '{}'::jsonb) || CASE WHEN mot IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('motivo', mot) END,
      updated_at = now()
  FROM transporte.metodos_pago m
  WHERE i.metodo_id = m.id
    AND i.reserva_id = r.id
    AND m.codigo = 'PAYPHONE'
    AND i.proveedor_orden = tx
    AND i.estado = 'PENDIENTE';
END $$;

-- 4. Exponer PAYPHONE habilitado y metadatos del intento en consultar_pago_cliente
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
    'habilitado',cfg.habilitado AND m.adaptador_disponible AND m.codigo IN('BANCO','PAYPHONE'),'instrucciones',cfg.instrucciones)
    ORDER BY m.nombre) FROM transporte.cooperativa_metodos_pago cfg JOIN transporte.metodos_pago m ON m.id=cfg.metodo_id
    WHERE cfg.cooperativa_id=r.cooperativa_id),'[]'::jsonb),
  'politica',(SELECT jsonb_build_object('maxBytes',p.max_bytes,'mimes',p.mimes,'referenciaObligatoria',p.referencia_obligatoria)
    FROM transporte.politica_comprobantes p WHERE p.cooperativa_id=r.cooperativa_id),
  'intento',(SELECT jsonb_build_object('id',i.id,'estado',i.estado,'cuentaId',i.cuenta_id,'cuentaSnapshot',i.cuenta_snapshot,
    'metodo',m.nombre,'metodoCodigo',m.codigo,'proveedorOrden',i.proveedor_orden,'totalCentavos',i.total_centavos)
    FROM transporte.intentos_pago i JOIN transporte.metodos_pago m ON m.id=i.metodo_id
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

REVOKE ALL ON FUNCTION
  transporte.crear_intento_pago(uuid, text, uuid, text),
  transporte.registrar_orden_payphone(uuid, text, text),
  transporte.buscar_intento_payphone(text),
  transporte.confirmar_pago_payphone(uuid, text, text, bigint),
  transporte.anular_intento_payphone(uuid, text, text),
  transporte.consultar_pago_cliente(uuid)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  transporte.crear_intento_pago(uuid, text, uuid, text),
  transporte.registrar_orden_payphone(uuid, text, text),
  transporte.buscar_intento_payphone(text),
  transporte.confirmar_pago_payphone(uuid, text, text, bigint),
  transporte.anular_intento_payphone(uuid, text, text),
  transporte.consultar_pago_cliente(uuid)
TO transporte_runtime;

COMMIT;
