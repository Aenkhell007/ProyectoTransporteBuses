-- Migración 20261130_auditoria_seguridad_pagos_wallet
-- Endurecimiento de seguridad RLS/TOCTOU, prórroga de comprobantes, soporte PayPhone cliente,
-- RF11 validación QR de abordaje, índices faltantes, mantenimiento y endpoints SQL públicos.
-- Aditiva e idempotente dentro de transacción única; no modifica ni elimina datos existentes.

BEGIN;

-- 1. Helper de permisos: exigir cooperativa activa para membresías tenant (ADMIN_SISTEMA GLOBAL conserva gestión)
CREATE OR REPLACE FUNCTION transporte.puede(
  p_permiso text,
  p_coop uuid DEFAULT NULL::uuid,
  p_oficina uuid DEFAULT NULL::uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
  SELECT EXISTS(
    SELECT 1 FROM transporte.usuarios u WHERE u.id = transporte.actor() AND u.activo
  ) AND (
    EXISTS(
      SELECT 1
      FROM transporte.usuario_roles_globales ur
      JOIN transporte.roles r ON r.id = ur.rol_id
      JOIN transporte.rol_permiso rp ON rp.rol_id = r.id
      JOIN transporte.permisos p ON p.id = rp.permiso_id
      WHERE ur.usuario_id = transporte.actor() AND r.ambito = 'GLOBAL' AND p.codigo = p_permiso
    )
    OR (
      p_coop IS NOT NULL AND EXISTS(
        SELECT 1
        FROM transporte.membresias m
        JOIN transporte.cooperativas c ON c.id = m.cooperativa_id
        JOIN transporte.permisos p ON p.codigo = p_permiso
        WHERE m.usuario_id = transporte.actor()
          AND m.activa
          AND c.activa
          AND m.cooperativa_id = p_coop
          AND (p_oficina IS NULL OR m.oficina_id IS NULL OR m.oficina_id = p_oficina)
          AND coalesce(
            (SELECT up.habilitado FROM transporte.usuario_permisos up WHERE up.membresia_id = m.id AND up.permiso_id = p.id),
            EXISTS(SELECT 1 FROM transporte.rol_permiso rp WHERE rp.rol_id = m.rol_id AND rp.permiso_id = p.id)
          )
      )
    )
  );
$function$;

-- 2. Alcance estricto de reservas: personal asignado a una oficina no accede a reservas web (oficina_id IS NULL)
CREATE OR REPLACE FUNCTION transporte.puede_en_reserva(
  p_permiso text,
  p_coop uuid,
  p_oficina uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
  SELECT transporte.puede(p_permiso, p_coop, p_oficina)
    AND (
      p_oficina IS NOT NULL
      OR transporte.puede(p_permiso)
      OR EXISTS(
        SELECT 1
        FROM transporte.membresias m
        JOIN transporte.cooperativas c ON c.id = m.cooperativa_id
        WHERE m.usuario_id = transporte.actor()
          AND m.activa
          AND c.activa
          AND m.cooperativa_id = p_coop
          AND m.oficina_id IS NULL
      )
    );
$function$;

CREATE OR REPLACE FUNCTION transporte.reserva_autorizada(p_id uuid)
RETURNS transporte.reservas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
DECLARE r transporte.reservas;
BEGIN
  SELECT * INTO r FROM transporte.reservas WHERE id = p_id;
  IF r.id IS NULL OR transporte.actor() IS NULL OR NOT (
    r.cliente_id = transporte.actor()
    OR transporte.puede_en_reserva('oficina.vender', r.cooperativa_id, r.oficina_id)
    OR transporte.puede_en_reserva('pagos.revisar', r.cooperativa_id, r.oficina_id)
    OR transporte.puede_en_reserva('reembolsos.gestionar', r.cooperativa_id, r.oficina_id)
  ) THEN
    RAISE EXCEPTION 'Reserva no accesible' USING ERRCODE = '42501';
  END IF;
  RETURN r;
END $function$;

CREATE OR REPLACE FUNCTION transporte.reserva_visible(p_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
  SELECT EXISTS(
    SELECT 1
    FROM transporte.reservas r
    WHERE r.id = p_id
      AND (
        r.cliente_id = transporte.actor()
        OR transporte.puede_en_reserva('cooperativa.leer', r.cooperativa_id, r.oficina_id)
      )
  );
$function$;

-- 3. RLS estricto para registrar_archivo por categoría y autorización real
DROP POLICY IF EXISTS registrar_archivo ON transporte.archivos;
CREATE POLICY registrar_archivo ON transporte.archivos
  FOR INSERT TO transporte_runtime
  WITH CHECK (
    propietario_id = transporte.actor()
    AND cooperativa_id IS NOT NULL
    AND (
      (
        categoria = 'COMPROBANTE' AND (
          EXISTS(
            SELECT 1 FROM transporte.reservas r
            WHERE r.cliente_id = transporte.actor()
              AND r.cooperativa_id = archivos.cooperativa_id
              AND r.estado = 'PENDIENTE'
              AND r.expires_at > now()
          )
          OR transporte.puede('oficina.vender', cooperativa_id)
          OR transporte.puede('pagos.revisar', cooperativa_id)
        )
      )
      OR (
        categoria = 'RESPALDO' AND (
          EXISTS(
            SELECT 1 FROM transporte.reservas r
            WHERE r.cliente_id = transporte.actor()
              AND r.cooperativa_id = archivos.cooperativa_id
              AND r.estado = 'PENDIENTE'
              AND r.expires_at > now()
          )
          OR transporte.puede('oficina.vender', cooperativa_id)
        )
      )
      OR (categoria = 'REEMBOLSO' AND transporte.puede('reembolsos.gestionar', cooperativa_id))
      OR (categoria = 'QR_BANCARIO' AND transporte.puede('pagos.configurar', cooperativa_id))
      OR (categoria = 'LOGO' AND transporte.puede('config.admin', cooperativa_id))
      OR (categoria = 'FOTO_BUS' AND transporte.puede('flota.admin', cooperativa_id))
      OR (
        categoria = 'DOCUMENTO' AND (
          transporte.puede('pagos.revisar', cooperativa_id)
          OR transporte.puede('oficina.vender', cooperativa_id)
          OR transporte.puede('reembolsos.gestionar', cooperativa_id)
          OR EXISTS(
            SELECT 1
            FROM transporte.compras c
            JOIN transporte.reservas r ON r.id = c.reserva_id
            JOIN transporte.pagos p ON p.id = c.pago_id
            JOIN transporte.intentos_pago i ON i.id = p.intento_id
            JOIN transporte.metodos_pago m ON m.id = i.metodo_id
            WHERE c.cooperativa_id = archivos.cooperativa_id
              AND r.cliente_id = transporte.actor()
              AND c.estado = 'CONFIRMADA'
              AND m.codigo = 'PAYPHONE'
          )
        )
      )
    )
  );

-- 4. Emisión y entrega de boletos: autorizar también reembolsos.gestionar y cliente dueño tras pago PAYPHONE
CREATE OR REPLACE FUNCTION transporte.marcar_boleto_emitido(p_compra uuid, p_archivo uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
DECLARE
  c transporte.compras;
  r transporte.reservas;
  es_payphone_cliente boolean := false;
BEGIN
  SELECT * INTO c FROM transporte.compras WHERE id = p_compra FOR UPDATE;
  IF c.id IS NULL OR c.estado <> 'CONFIRMADA' THEN
    RAISE EXCEPTION 'Compra no emitible';
  END IF;

  SELECT * INTO r FROM transporte.reservas WHERE id = c.reserva_id;

  SELECT EXISTS(
    SELECT 1
    FROM transporte.pagos p
    JOIN transporte.intentos_pago i ON i.id = p.intento_id
    JOIN transporte.metodos_pago m ON m.id = i.metodo_id
    WHERE p.id = c.pago_id AND m.codigo = 'PAYPHONE'
  ) AND r.cliente_id = transporte.actor()
  INTO es_payphone_cliente;

  IF NOT (
    transporte.puede_en_reserva('pagos.revisar', r.cooperativa_id, r.oficina_id)
    OR transporte.puede_en_reserva('oficina.vender', r.cooperativa_id, r.oficina_id)
    OR transporte.puede_en_reserva('reembolsos.gestionar', r.cooperativa_id, r.oficina_id)
    OR es_payphone_cliente
  ) THEN
    RAISE EXCEPTION 'Sin permiso para emitir boleto' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS(
    SELECT 1
    FROM transporte.archivos
    WHERE id = p_archivo
      AND cooperativa_id = c.cooperativa_id
      AND categoria = 'DOCUMENTO'
      AND mime = 'application/pdf'
      AND validado_servidor
  ) THEN
    RAISE EXCEPTION 'Documento privado no valido';
  END IF;

  UPDATE transporte.boletos
  SET estado = 'LISTO', archivo_id = p_archivo, emitido_at = now()
  WHERE compra_id = c.id;
END $function$;

CREATE OR REPLACE FUNCTION transporte.asignar_entrega_boleto(p_compra uuid, p_backend text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
DECLARE
  c transporte.compras;
  r transporte.reservas;
  es_payphone_cliente boolean := false;
BEGIN
  SELECT * INTO c FROM transporte.compras WHERE id = p_compra;
  SELECT * INTO r FROM transporte.reservas WHERE id = c.reserva_id;

  IF c.id IS NOT NULL AND r.id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1
      FROM transporte.pagos p
      JOIN transporte.intentos_pago i ON i.id = p.intento_id
      JOIN transporte.metodos_pago m ON m.id = i.metodo_id
      WHERE p.id = c.pago_id AND m.codigo = 'PAYPHONE'
    ) AND r.cliente_id = transporte.actor()
    INTO es_payphone_cliente;
  END IF;

  IF c.id IS NULL OR length(coalesce(p_backend, '')) < 8 OR NOT (
    transporte.puede_en_reserva('pagos.revisar', r.cooperativa_id, r.oficina_id)
    OR transporte.puede_en_reserva('oficina.vender', r.cooperativa_id, r.oficina_id)
    OR transporte.puede_en_reserva('reembolsos.gestionar', r.cooperativa_id, r.oficina_id)
    OR es_payphone_cliente
  ) OR NOT EXISTS(
    SELECT 1
    FROM transporte.boletos b
    JOIN transporte.archivos a ON a.id = b.archivo_id
    WHERE b.compra_id = c.id AND b.estado = 'LISTO' AND a.propietario_id = transporte.actor()
  ) THEN
    RAISE EXCEPTION 'Emisión no autorizada' USING ERRCODE = '42501';
  END IF;

  UPDATE transporte.notificaciones
  SET payload = payload || jsonb_build_object('backendId', p_backend)
  WHERE tipo = 'COMPRA_CONFIRMADA'
    AND payload->>'compraId' = p_compra::text
    AND estado = 'PENDIENTE'
    AND NOT payload ? 'backendId';
END $function$;

-- 5. Comprobantes con prórroga de revisión y bloqueo TOCTOU; expirar_reservas protege EN_REVISION
CREATE OR REPLACE FUNCTION transporte.registrar_comprobante(p_intento uuid, p_archivo uuid, p_referencia text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
DECLARE
  i transporte.intentos_pago;
  r transporte.reservas;
  v transporte.viajes;
  a transporte.archivos;
  cfg transporte.politica_comprobantes;
  c transporte.comprobantes;
  cid uuid;
  v_prorroga integer;
  v_nuevo_expires timestamptz;
BEGIN
  SELECT * INTO i FROM transporte.intentos_pago WHERE id = p_intento;
  IF i.id IS NULL THEN
    RAISE EXCEPTION 'Intento no disponible' USING ERRCODE = '42501';
  END IF;
  r := transporte.reserva_autorizada(i.reserva_id);
  SELECT * INTO r FROM transporte.reservas WHERE id = r.id FOR UPDATE;
  SELECT * INTO i FROM transporte.intentos_pago WHERE id = p_intento FOR UPDATE;
  SELECT * INTO v FROM transporte.viajes WHERE id = r.viaje_id;

  SELECT * INTO c FROM transporte.comprobantes WHERE intento_id = i.id;
  IF c.id IS NOT NULL THEN
    IF c.archivo_id <> p_archivo OR c.referencia IS DISTINCT FROM nullif(trim(p_referencia), '') THEN
      RAISE EXCEPTION 'Envio repetido con archivo/referencia distintos';
    END IF;
    RETURN c.id;
  END IF;

  IF r.estado <> 'PENDIENTE' OR r.expires_at <= now() OR i.estado <> 'PENDIENTE'
     OR (SELECT codigo FROM transporte.metodos_pago WHERE id = i.metodo_id) <> 'BANCO' THEN
    RAISE EXCEPTION 'Intento no recibe comprobante';
  END IF;

  SELECT * INTO a
  FROM transporte.archivos
  WHERE id = p_archivo AND propietario_id = transporte.actor() AND cooperativa_id = r.cooperativa_id
    AND categoria = 'COMPROBANTE' AND validado_servidor;
  SELECT * INTO cfg FROM transporte.politica_comprobantes WHERE cooperativa_id = r.cooperativa_id;

  IF a.id IS NULL OR cfg.id IS NULL OR a.bytes > cfg.max_bytes OR NOT (a.mime = ANY(cfg.mimes))
     OR length(coalesce(p_referencia, '')) > 120
     OR (cfg.referencia_obligatoria AND length(trim(coalesce(p_referencia, ''))) = 0) THEN
    RAISE EXCEPTION 'Archivo o referencia no validos';
  END IF;

  INSERT INTO transporte.comprobantes(cooperativa_id, intento_id, archivo_id, referencia)
  VALUES (r.cooperativa_id, i.id, a.id, nullif(trim(p_referencia), ''))
  RETURNING id INTO cid;

  UPDATE transporte.intentos_pago SET estado = 'EN_REVISION' WHERE id = i.id;

  -- Prórroga de revisión acotada por la hora de salida para evitar vencimiento prematuro en cola
  v_prorroga := greatest(coalesce(cfg.prorroga_revision_minutos, 0), 120);
  IF v.id IS NOT NULL AND v.salida > now() THEN
    v_nuevo_expires := least(v.salida, greatest(r.expires_at, now() + make_interval(mins => v_prorroga)));
    IF v_nuevo_expires > r.expires_at THEN
      UPDATE transporte.reservas SET expires_at = v_nuevo_expires WHERE id = r.id;
      UPDATE transporte.reserva_asientos SET expires_at = v_nuevo_expires WHERE reserva_id = r.id AND estado = 'RETENIDO';
    END IF;
  END IF;

  INSERT INTO transporte.notificaciones(usuario_id, cooperativa_id, tipo, canal, evento_clave, payload)
  VALUES (r.cliente_id, r.cooperativa_id, 'PAGO_EN_REVISION', 'APP', 'comprobante:' || cid, jsonb_build_object('reservaId', r.id));

  RETURN cid;
END $function$;

CREATE OR REPLACE FUNCTION transporte.expirar_reservas(p_viaje uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
DECLARE
  n integer := 0;
  v_salida timestamptz;
BEGIN
  SELECT salida INTO v_salida FROM transporte.viajes WHERE id = p_viaje FOR UPDATE;

  UPDATE transporte.reservas r
  SET estado = 'VENCIDA'
  WHERE r.viaje_id = p_viaje
    AND r.estado = 'PENDIENTE'
    AND r.expires_at <= now()
    AND NOT (
      coalesce(v_salida > now(), false)
      AND EXISTS (
        SELECT 1 FROM transporte.intentos_pago i
        WHERE i.reserva_id = r.id AND i.estado = 'EN_REVISION'
      )
    );
  GET DIAGNOSTICS n = ROW_COUNT;

  UPDATE transporte.reserva_asientos a
  SET estado = 'LIBERADO'
  FROM transporte.reservas r
  WHERE a.reserva_id = r.id AND r.viaje_id = p_viaje AND r.estado IN ('VENCIDA', 'CANCELADA') AND a.estado = 'RETENIDO';

  UPDATE transporte.intentos_pago i
  SET estado = 'ANULADO'
  FROM transporte.reservas r
  WHERE i.reserva_id = r.id AND r.viaje_id = p_viaje AND r.estado = 'VENCIDA' AND i.estado = 'PENDIENTE';

  RETURN n;
END $function$;

-- 6. Aislamiento multi-tenant seguro en registrar_paradero_local
CREATE OR REPLACE FUNCTION transporte.registrar_paradero_local(
  p_cooperativa_id uuid,
  p_ciudad_id uuid,
  p_nombre text,
  p_tipo_punto text,
  p_sector text DEFAULT NULL::text,
  p_direccion text DEFAULT NULL::text,
  p_referencia text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
DECLARE
  v_ambito text;
  v_coop_prov text;
  v_ciudad_prov text;
  v_nombre text;
  v_tipo text;
  v_sector text;
  v_direccion text;
  v_referencia text;
  v_id uuid;
  v_existente transporte.terminales;
BEGIN
  PERFORM transporte.exigir('operacion.admin', p_cooperativa_id);

  SELECT ambito_operacion, provincia
  INTO v_ambito, v_coop_prov
  FROM transporte.cooperativas
  WHERE id = p_cooperativa_id AND activa;

  IF v_ambito IS NULL THEN
    RAISE EXCEPTION 'Cooperativa no disponible' USING ERRCODE = '42501';
  END IF;

  SELECT provincia INTO v_ciudad_prov FROM transporte.ciudades WHERE id = p_ciudad_id AND activa;
  IF v_ciudad_prov IS NULL THEN
    RAISE EXCEPTION 'Cantón no disponible' USING ERRCODE = '23514';
  END IF;

  IF v_ambito IN ('URBANA', 'RURAL')
     AND lower(trim(v_ciudad_prov)) <> lower(trim(coalesce(v_coop_prov, ''))) THEN
    RAISE EXCEPTION 'El punto de referencia debe pertenecer a la provincia asignada a la cooperativa' USING ERRCODE = '23514';
  END IF;

  v_nombre := trim(coalesce(p_nombre, ''));
  v_tipo := upper(trim(coalesce(nullif(p_tipo_punto, ''), 'PARADERO')));
  v_sector := nullif(trim(coalesce(p_sector, '')), '');
  v_direccion := nullif(trim(coalesce(p_direccion, '')), '');
  v_referencia := nullif(trim(coalesce(p_referencia, '')), '');

  IF v_tipo NOT IN ('TERMINAL', 'PARADERO', 'BARRIO', 'PARROQUIA', 'MERCADO', 'SECTOR', 'REFERENCIA')
     OR length(v_nombre) NOT BETWEEN 2 AND 150 THEN
    RAISE EXCEPTION 'Nombre o tipo de punto de referencia inválido' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_existente
  FROM transporte.terminales
  WHERE ciudad_id = p_ciudad_id AND nombre = v_nombre
  FOR UPDATE;

  IF v_existente.id IS NOT NULL THEN
    IF v_existente.cooperativa_id IS NULL THEN
      RETURN v_existente.id;
    ELSIF v_existente.cooperativa_id <> p_cooperativa_id THEN
      RAISE EXCEPTION 'Ya existe un paradero registrado con ese nombre por otra cooperativa en este cantón' USING ERRCODE = '23505';
    ELSE
      UPDATE transporte.terminales
      SET direccion = coalesce(v_direccion, direccion),
          sector = coalesce(v_sector, sector),
          referencia = coalesce(v_referencia, referencia),
          tipo_punto = v_tipo,
          activa = true,
          updated_at = now()
      WHERE id = v_existente.id
      RETURNING id INTO v_id;
      RETURN v_id;
    END IF;
  END IF;

  INSERT INTO transporte.terminales (
    ciudad_id, nombre, direccion, tipo_punto, sector, referencia, cooperativa_id, activa
  )
  VALUES (
    p_ciudad_id, v_nombre, v_direccion, v_tipo, v_sector, v_referencia, p_cooperativa_id, true
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END $function$;

-- 7. Recargas TOCTOU FOR UPDATE, validación de estados e integridad en funciones transaccionales
CREATE OR REPLACE FUNCTION transporte.guardar_pasajero(p_asiento_reserva uuid, p_datos jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
DECLARE a transporte.reserva_asientos; r transporte.reservas; pid uuid;
BEGIN
  SELECT * INTO a FROM transporte.reserva_asientos WHERE id = p_asiento_reserva;
  IF a.id IS NULL THEN
    RAISE EXCEPTION 'Asiento de reserva no accesible' USING ERRCODE = '42501';
  END IF;
  r := transporte.reserva_autorizada(a.reserva_id);
  SELECT * INTO r FROM transporte.reservas WHERE id = r.id FOR UPDATE;
  IF r.estado <> 'PENDIENTE' OR r.expires_at <= now()
     OR EXISTS(SELECT 1 FROM transporte.intentos_pago WHERE reserva_id = r.id AND estado <> 'ANULADO') THEN
    RAISE EXCEPTION 'Reserva no editable; resuelva o anule el intento antes';
  END IF;
  IF p_datos->>'nacimiento' IS NOT NULL AND (p_datos->>'nacimiento')::date > current_date THEN
    RAISE EXCEPTION 'Nacimiento futuro';
  END IF;
  INSERT INTO transporte.pasajeros(
    cooperativa_id, reserva_asiento_id, nombres, apellidos, tipo_documento, documento, nacimiento, beneficio_codigo, respaldo_archivo_id
  )
  VALUES(
    r.cooperativa_id, a.id, trim(p_datos->>'nombres'), trim(p_datos->>'apellidos'),
    p_datos->>'tipoDocumento', p_datos->>'documento', nullif(p_datos->>'nacimiento', '')::date,
    nullif(p_datos->>'beneficio', ''), nullif(p_datos->>'respaldoArchivoId', '')::uuid
  )
  ON CONFLICT(reserva_asiento_id) DO UPDATE SET
    nombres = excluded.nombres,
    apellidos = excluded.apellidos,
    tipo_documento = excluded.tipo_documento,
    documento = excluded.documento,
    nacimiento = excluded.nacimiento,
    beneficio_codigo = excluded.beneficio_codigo,
    respaldo_archivo_id = excluded.respaldo_archivo_id
  RETURNING id INTO pid;
  UPDATE transporte.reservas SET aceptada_version = NULL WHERE id = r.id;
  RETURN pid;
END $function$;

CREATE OR REPLACE FUNCTION transporte.cotizar(p_reserva uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
DECLARE r transporte.reservas; v transporte.viajes; bus transporte.buses; l record; t transporte.tarifas; b transporte.beneficios; imp integer; imp_s integer; edad integer; dto bigint; iva bigint; qid uuid; version_n integer;
BEGIN
  r := transporte.reserva_autorizada(p_reserva);
  SELECT * INTO r FROM transporte.reservas WHERE id = r.id FOR UPDATE;
  IF r.estado <> 'PENDIENTE' OR r.expires_at <= now()
     OR EXISTS(SELECT 1 FROM transporte.intentos_pago WHERE reserva_id = r.id AND estado <> 'ANULADO') THEN
    RAISE EXCEPTION 'No puede recotizar esta reserva';
  END IF;
  IF (SELECT count(*) FROM transporte.pasajeros p JOIN transporte.reserva_asientos a ON a.id = p.reserva_asiento_id WHERE a.reserva_id = r.id) <> r.cantidad THEN
    RAISE EXCEPTION 'Complete un pasajero por asiento';
  END IF;
  SELECT * INTO v FROM transporte.viajes WHERE id = r.viaje_id;
  SELECT * INTO bus FROM transporte.buses WHERE id = v.bus_id;
  SELECT coalesce(max(version), 0) + 1 INTO version_n FROM transporte.cotizaciones WHERE reserva_id = r.id;
  INSERT INTO transporte.cotizaciones(cooperativa_id, reserva_id, version, base_centavos, descuento_centavos, servicio_centavos, subtotal_neto_centavos, iva_centavos, total_centavos)
  VALUES(r.cooperativa_id, r.id, version_n, 0, 0, 0, 0, 0, 0) RETURNING id INTO qid;
  FOR l IN
    SELECT a.id, pc.clase_id, p.nacimiento, p.beneficio_codigo, p.respaldo_archivo_id
    FROM transporte.reserva_asientos a
    JOIN transporte.plano_celdas pc ON pc.id = a.asiento_id
    JOIN transporte.pasajeros p ON p.reserva_asiento_id = a.id
    WHERE a.reserva_id = r.id AND a.estado = 'RETENIDO'
  LOOP
    SELECT * INTO t FROM transporte.tarifas
    WHERE frecuencia_id = v.frecuencia_id AND grupo_id = bus.grupo_id AND clase_id = l.clase_id
      AND origen_orden = r.origen_orden AND destino_orden = r.destino_orden AND activa
      AND vigencia @> (v.salida AT TIME ZONE 'America/Guayaquil')::date;
    IF t.id IS NULL THEN RAISE EXCEPTION 'Falta tarifa para tramo/clase/fecha'; END IF;
    b := NULL; dto := 0;
    IF l.beneficio_codigo IS NOT NULL THEN
      SELECT * INTO b FROM transporte.beneficios
      WHERE cooperativa_id = r.cooperativa_id AND codigo = l.beneficio_codigo AND activo
        AND vigencia @> (v.salida AT TIME ZONE 'America/Guayaquil')::date;
      IF b.id IS NULL THEN RAISE EXCEPTION 'Beneficio no definido o inactivo'; END IF;
      edad := extract(year FROM age((v.salida AT TIME ZONE 'America/Guayaquil')::date, l.nacimiento));
      IF (b.edad_min IS NOT NULL OR b.edad_max_exclusiva IS NOT NULL)
         AND (l.nacimiento IS NULL OR edad < coalesce(b.edad_min, 0) OR edad >= coalesce(b.edad_max_exclusiva, 1000)) THEN
        RAISE EXCEPTION 'Edad no elegible';
      END IF;
      IF b.codigo = 'DISCAPACIDAD' AND l.respaldo_archivo_id IS NULL THEN RAISE EXCEPTION 'Falta respaldo de beneficio'; END IF;
      dto := round(t.precio_centavos * b.descuento_bp / 10000.0)::bigint;
    END IF;
    SELECT puntos_base INTO imp FROM transporte.impuestos WHERE id = t.impuesto_id AND activo;
    imp_s := 0;
    IF t.servicio_centavos > 0 THEN
      SELECT puntos_base INTO imp_s FROM transporte.impuestos WHERE id = t.impuesto_servicio_id AND activo;
    END IF;
    IF imp IS NULL OR imp_s IS NULL THEN RAISE EXCEPTION 'Impuesto no definido'; END IF;
    iva := round((t.precio_centavos - dto) * imp / 10000.0)::bigint + round(t.servicio_centavos * imp_s / 10000.0)::bigint;
    INSERT INTO transporte.cotizacion_lineas(
      cooperativa_id, cotizacion_id, reserva_asiento_id, tarifa_id, beneficio_id,
      base_centavos, descuento_centavos, servicio_centavos, impuesto_bp, impuesto_servicio_bp, iva_centavos
    )
    VALUES(r.cooperativa_id, qid, l.id, t.id, b.id, t.precio_centavos, dto, t.servicio_centavos, imp, imp_s, iva);
  END LOOP;
  UPDATE transporte.cotizaciones q
  SET base_centavos = z.base, descuento_centavos = z.dto, servicio_centavos = z.servicio,
      subtotal_neto_centavos = z.base - z.dto + z.servicio, iva_centavos = z.iva,
      total_centavos = z.base - z.dto + z.servicio + z.iva
  FROM(
    SELECT sum(base_centavos) base, sum(descuento_centavos) dto, sum(servicio_centavos) servicio, sum(iva_centavos) iva
    FROM transporte.cotizacion_lineas WHERE cotizacion_id = qid
  ) z
  WHERE q.id = qid;
  UPDATE transporte.reservas
  SET cotizacion_version = version_n, aceptada_version = NULL,
      total_centavos = (SELECT total_centavos FROM transporte.cotizaciones WHERE id = qid)
  WHERE id = r.id;
  RETURN qid;
END $function$;

CREATE OR REPLACE FUNCTION transporte.aceptar_cotizacion(p_reserva uuid, p_version integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
DECLARE r transporte.reservas;
BEGIN
  r := transporte.reserva_autorizada(p_reserva);
  SELECT * INTO r FROM transporte.reservas WHERE id = r.id FOR UPDATE;
  IF r.estado <> 'PENDIENTE' OR r.expires_at <= now() OR r.cotizacion_version <> p_version OR p_version < 1 THEN
    RAISE EXCEPTION 'Cotizacion vencida o version incorrecta';
  END IF;
  UPDATE transporte.reservas SET aceptada_version = p_version WHERE id = r.id;
END $function$;

CREATE OR REPLACE FUNCTION transporte.crear_intento_pago(p_reserva uuid, p_metodo text, p_cuenta uuid, p_clave text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
DECLARE
  r transporte.reservas;
  m transporte.metodos_pago;
  cfg transporte.cooperativa_metodos_pago;
  cuenta transporte.cuentas_bancarias;
  anterior transporte.intentos_pago;
  iid uuid;
BEGIN
  r := transporte.reserva_autorizada(p_reserva);
  SELECT * INTO r FROM transporte.reservas WHERE id = r.id FOR UPDATE;
  SELECT * INTO anterior FROM transporte.intentos_pago WHERE actor_id = transporte.actor() AND clave_intento = p_clave;
  SELECT * INTO m FROM transporte.metodos_pago WHERE codigo = p_metodo;
  IF anterior.id IS NOT NULL THEN
    IF anterior.reserva_id <> r.id OR anterior.metodo_id IS DISTINCT FROM m.id OR anterior.cuenta_id IS DISTINCT FROM p_cuenta THEN
      RAISE EXCEPTION 'Clave reutilizada con otro contenido';
    END IF;
    RETURN anterior.id;
  END IF;
  IF r.estado <> 'PENDIENTE' OR r.expires_at <= now() OR r.aceptada_version IS DISTINCT FROM r.cotizacion_version
     OR r.cotizacion_version < 1 OR length(trim(coalesce(p_clave, ''))) = 0 THEN
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

  -- Permite cambiar entre métodos o cuentas mientras un intento BANCO/PAYPHONE previo esté PENDIENTE y sin comprobante
  UPDATE transporte.intentos_pago i
  SET estado = 'ANULADO', updated_at = now()
  WHERE i.reserva_id = r.id
    AND i.estado = 'PENDIENTE'
    AND NOT EXISTS (SELECT 1 FROM transporte.comprobantes c WHERE c.intento_id = i.id)
    AND (
      p_metodo IN ('PAYPHONE', 'BANCO')
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
END $function$;

CREATE OR REPLACE FUNCTION transporte.confirmar_compra_interna(p_intento uuid, p_recibido bigint DEFAULT NULL::bigint)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
DECLARE i transporte.intentos_pago; r transporte.reservas; v transporte.viajes; pid uuid; cid uuid; politica uuid;
BEGIN
  SELECT * INTO i FROM transporte.intentos_pago WHERE id = p_intento FOR UPDATE;
  IF i.id IS NULL OR i.estado NOT IN ('PENDIENTE', 'EN_REVISION') THEN
    RAISE EXCEPTION 'Intento de pago no confirmable';
  END IF;
  SELECT * INTO r FROM transporte.reservas WHERE id = i.reserva_id FOR UPDATE;
  SELECT * INTO v FROM transporte.viajes WHERE id = r.viaje_id;
  IF r.estado <> 'PENDIENTE' OR r.expires_at <= now() OR v.salida <= now() OR v.estado <> 'PUBLICADO'
     OR r.aceptada_version IS DISTINCT FROM i.cotizacion_version OR i.total_centavos <> r.total_centavos
     OR (SELECT count(*) FROM transporte.reserva_asientos WHERE reserva_id = r.id AND estado = 'RETENIDO' AND expires_at > now()) <> r.cantidad THEN
    RAISE EXCEPTION 'Reserva no confirmable; conciliar fondos sin emitir boleto';
  END IF;
  IF p_recibido IS NOT NULL AND p_recibido < i.total_centavos THEN
    RAISE EXCEPTION 'Efectivo insuficiente';
  END IF;
  INSERT INTO transporte.pagos(cooperativa_id, reserva_id, intento_id, monto_centavos, recibido_centavos, cambio_centavos, confirmado_por)
  VALUES(r.cooperativa_id, r.id, i.id, i.total_centavos, p_recibido, CASE WHEN p_recibido IS NULL THEN NULL ELSE p_recibido - i.total_centavos END, transporte.actor())
  RETURNING id INTO pid;
  SELECT id INTO politica FROM transporte.politicas_reembolso WHERE cooperativa_id = r.cooperativa_id AND estado = 'PUBLICADA';
  INSERT INTO transporte.compras(cooperativa_id, reserva_id, pago_id, politica_reembolso_id, viaje_snapshot, total_pagado_centavos)
  VALUES(
    r.cooperativa_id, r.id, pid, politica,
    to_jsonb(v) || jsonb_build_object(
      'origenOrden', r.origen_orden,
      'destinoOrden', r.destino_orden,
      'cooperativa', (SELECT jsonb_build_object('nombre', nombre, 'razonSocial', razon_social, 'ruc', ruc) FROM transporte.cooperativas WHERE id = r.cooperativa_id),
      'bus', (SELECT jsonb_build_object('unidad', b.unidad, 'placa', b.placa, 'chasis', b.chasis, 'carroceria', b.carroceria, 'grupo', g.nombre) FROM transporte.buses b JOIN transporte.grupos_bus g ON g.id = b.grupo_id WHERE b.id = v.bus_id),
      'terminalOrigen', (SELECT jsonb_build_object('terminal', t.nombre, 'ciudad', c.nombre) FROM transporte.ruta_paradas p JOIN transporte.terminales t ON t.id = p.terminal_id JOIN transporte.ciudades c ON c.id = t.ciudad_id JOIN transporte.frecuencias f ON f.ruta_id = p.ruta_id WHERE f.id = v.frecuencia_id AND p.orden = r.origen_orden),
      'terminalDestino', (SELECT jsonb_build_object('terminal', t.nombre, 'ciudad', c.nombre) FROM transporte.ruta_paradas p JOIN transporte.terminales t ON t.id = p.terminal_id JOIN transporte.ciudades c ON c.id = t.ciudad_id JOIN transporte.frecuencias f ON f.ruta_id = p.ruta_id WHERE f.id = v.frecuencia_id AND p.orden = r.destino_orden)
    ),
    i.total_centavos
  ) RETURNING id INTO cid;
  INSERT INTO transporte.boletos(cooperativa_id, compra_id) VALUES(r.cooperativa_id, cid);
  UPDATE transporte.reserva_asientos SET estado = 'CONFIRMADO' WHERE reserva_id = r.id AND estado = 'RETENIDO';
  UPDATE transporte.reservas SET estado = 'CONFIRMADA' WHERE id = r.id;
  UPDATE transporte.intentos_pago SET estado = 'APROBADO' WHERE id = i.id;
  INSERT INTO transporte.notificaciones(usuario_id, cooperativa_id, tipo, canal, evento_clave, payload)
  SELECT r.cliente_id, r.cooperativa_id, 'COMPRA_CONFIRMADA', canal, 'compra:' || cid, jsonb_build_object('compraId', cid, 'documentoPendiente', true)
  FROM unnest(ARRAY['APP', 'EMAIL', 'WHATSAPP']) canal;
  RETURN cid;
END $function$;

CREATE OR REPLACE FUNCTION transporte.decidir_comprobante(p_comprobante uuid, p_aprobar boolean, p_motivo text, p_version integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
DECLARE c transporte.comprobantes; i transporte.intentos_pago; r transporte.reservas; v transporte.viajes; cid uuid;
BEGIN
  SELECT * INTO c FROM transporte.comprobantes WHERE id = p_comprobante;
  IF c.id IS NULL THEN
    RAISE EXCEPTION 'Comprobante no encontrado' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO i FROM transporte.intentos_pago WHERE id = c.intento_id;
  SELECT * INTO r FROM transporte.reservas WHERE id = i.reserva_id;
  PERFORM transporte.exigir('pagos.revisar', r.cooperativa_id, r.oficina_id);
  IF NOT transporte.puede_en_reserva('pagos.revisar', r.cooperativa_id, r.oficina_id) THEN
    RAISE EXCEPTION 'Sin permiso para revisar esta reserva' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM transporte.viajes WHERE id = r.viaje_id FOR UPDATE;
  SELECT * INTO r FROM transporte.reservas WHERE id = r.id FOR UPDATE;
  SELECT * INTO i FROM transporte.intentos_pago WHERE id = i.id FOR UPDATE;
  SELECT * INTO c FROM transporte.comprobantes WHERE id = p_comprobante FOR UPDATE;
  IF c.estado <> 'EN_REVISION' THEN
    IF (p_aprobar AND c.estado = 'APROBADO') OR (NOT p_aprobar AND c.estado = 'RECHAZADO') THEN
      SELECT id INTO cid FROM transporte.compras WHERE reserva_id = r.id;
      RETURN cid;
    END IF;
    RAISE EXCEPTION 'Comprobante ya resuelto';
  END IF;
  IF c.version <> p_version THEN
    RAISE EXCEPTION 'Version de comprobante incorrecta';
  END IF;
  IF (NOT p_aprobar AND length(trim(coalesce(p_motivo, ''))) = 0) OR length(coalesce(p_motivo, '')) > 300 THEN
    RAISE EXCEPTION 'Motivo requerido/maximo300';
  END IF;
  IF p_aprobar THEN
    cid := transporte.confirmar_compra_interna(i.id);
  ELSE
    UPDATE transporte.intentos_pago SET estado = 'RECHAZADO' WHERE id = i.id;
    SELECT * INTO v FROM transporte.viajes WHERE id = r.viaje_id;
    IF r.estado = 'PENDIENTE' AND v.id IS NOT NULL AND v.salida > now() AND r.expires_at < now() + interval '15 minutes' THEN
      UPDATE transporte.reservas SET expires_at = least(v.salida, now() + interval '15 minutes') WHERE id = r.id;
      UPDATE transporte.reserva_asientos SET expires_at = least(v.salida, now() + interval '15 minutes') WHERE reserva_id = r.id AND estado = 'RETENIDO';
    END IF;
  END IF;
  UPDATE transporte.comprobantes
  SET estado = CASE WHEN p_aprobar THEN 'APROBADO' ELSE 'RECHAZADO' END,
      motivo = nullif(trim(p_motivo), ''),
      revisado_por = transporte.actor(),
      revisado_at = now(),
      version = version + 1
  WHERE id = c.id;
  RETURN cid;
END $function$;

CREATE OR REPLACE FUNCTION transporte.restablecer_password(p_token_hash text, p_nuevo_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
DECLARE t transporte.tokens_identidad;
BEGIN
  SELECT * INTO t FROM transporte.tokens_identidad WHERE token_hash = p_token_hash AND proposito = 'RECUPERACION' FOR UPDATE;
  IF t.id IS NULL OR t.consumido_at IS NOT NULL OR t.expires_at <= now() OR p_nuevo_hash NOT LIKE 'scrypt-v1$%'
     OR NOT EXISTS(SELECT 1 FROM transporte.usuarios u WHERE u.id = t.usuario_id AND u.activo) THEN
    RAISE EXCEPTION 'Token o nueva credencial no validos';
  END IF;
  UPDATE transporte.credenciales SET password_hash = p_nuevo_hash, password_updated_at = now() WHERE usuario_id = t.usuario_id;
  IF NOT FOUND THEN
    INSERT INTO transporte.credenciales(usuario_id, password_hash) VALUES(t.usuario_id, p_nuevo_hash);
  END IF;
  UPDATE transporte.tokens_identidad SET consumido_at = now() WHERE id = t.id;
  UPDATE transporte.sesiones SET revocada_at = now() WHERE usuario_id = t.usuario_id AND revocada_at IS NULL;
END $function$;

CREATE OR REPLACE FUNCTION transporte.identidad_asignar_rol(p_usuario uuid, p_version integer, p_datos jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE rid uuid; cid uuid; oid uuid; mid uuid; actual integer; v_existente uuid;
BEGIN
  PERFORM transporte.exigir('identidad.admin');
  PERFORM 1 FROM transporte.roles WHERE codigo = 'ADMIN_SISTEMA' FOR UPDATE;
  SELECT version INTO actual FROM transporte.usuarios WHERE id = p_usuario FOR UPDATE;
  IF actual IS DISTINCT FROM p_version THEN
    RAISE EXCEPTION 'Version obsoleta' USING ERRCODE = '40001';
  END IF;
  SELECT id INTO rid FROM transporte.roles WHERE codigo = p_datos->>'rol';
  IF rid IS NULL THEN
    RAISE EXCEPTION 'Rol invalido';
  END IF;
  IF p_datos->>'rol' <> 'ADMIN_SISTEMA' AND EXISTS(
    SELECT 1 FROM transporte.usuario_roles_globales g JOIN transporte.roles r ON r.id = g.rol_id
    WHERE g.usuario_id = p_usuario AND r.codigo = 'ADMIN_SISTEMA'
  ) THEN
    IF (
      SELECT count(DISTINCT g.usuario_id)
      FROM transporte.usuario_roles_globales g
      JOIN transporte.roles r ON r.id = g.rol_id
      JOIN transporte.usuarios u ON u.id = g.usuario_id
      WHERE r.codigo = 'ADMIN_SISTEMA' AND u.activo
    ) <= 1 THEN
      RAISE EXCEPTION 'No puede retirar al ultimo administrador';
    END IF;
    DELETE FROM transporte.usuario_roles_globales g
    USING transporte.roles r
    WHERE g.rol_id = r.id AND r.codigo = 'ADMIN_SISTEMA' AND g.usuario_id = p_usuario;
  END IF;

  IF p_datos->>'rol' = 'ADMIN_SISTEMA' THEN
    INSERT INTO transporte.usuario_roles_globales(usuario_id, rol_id) VALUES(p_usuario, rid) ON CONFLICT DO NOTHING;
  ELSIF p_datos->>'rol' = 'CLIENTE' THEN
    UPDATE transporte.membresias SET activa = false, version = version + 1 WHERE usuario_id = p_usuario AND activa;
  ELSE
    cid := nullif(p_datos->>'cooperativaId', '')::uuid;
    oid := nullif(p_datos->>'oficinaId', '')::uuid;
    mid := nullif(p_datos->>'membresiaId', '')::uuid;
    IF NOT EXISTS(SELECT 1 FROM transporte.cooperativas WHERE id = cid AND activa) THEN
      RAISE EXCEPTION 'Cooperativa no disponible';
    END IF;
    IF oid IS NOT NULL AND NOT EXISTS(SELECT 1 FROM transporte.oficinas WHERE id = oid AND cooperativa_id = cid AND activa) THEN
      RAISE EXCEPTION 'Oficina de otra cooperativa';
    END IF;
    IF mid IS NOT NULL THEN
      IF NOT EXISTS(SELECT 1 FROM transporte.membresias WHERE id = mid AND usuario_id = p_usuario) THEN
        RAISE EXCEPTION 'Membresia de otro usuario';
      END IF;
      DELETE FROM transporte.usuario_permisos WHERE membresia_id = mid;
      UPDATE transporte.membresias
      SET rol_id = rid, cooperativa_id = cid, oficina_id = oid, activa = true, version = version + 1
      WHERE id = mid;
    ELSE
      SELECT id INTO v_existente
      FROM transporte.membresias
      WHERE usuario_id = p_usuario AND cooperativa_id = cid AND rol_id = rid AND oficina_id IS NOT DISTINCT FROM oid
      FOR UPDATE;
      IF v_existente IS NOT NULL THEN
        DELETE FROM transporte.usuario_permisos WHERE membresia_id = v_existente;
        UPDATE transporte.membresias SET activa = true, version = version + 1 WHERE id = v_existente;
      ELSE
        INSERT INTO transporte.membresias(usuario_id, cooperativa_id, oficina_id, rol_id)
        VALUES(p_usuario, cid, oid, rid);
      END IF;
    END IF;
  END IF;
  UPDATE transporte.usuarios SET version = version + 1, updated_at = now() WHERE id = p_usuario;
  UPDATE transporte.sesiones SET revocada_at = now() WHERE usuario_id = p_usuario AND revocada_at IS NULL;
END $function$;

CREATE OR REPLACE FUNCTION transporte.buscar_intento_payphone(p_client_tx_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
DECLARE
  i transporte.intentos_pago;
  r transporte.reservas;
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
  r := transporte.reserva_autorizada(i.reserva_id);
  SELECT id INTO cid FROM transporte.compras WHERE reserva_id = i.reserva_id;
  RETURN jsonb_build_object(
    'intentoId', i.id,
    'reservaId', i.reserva_id,
    'estado', i.estado,
    'totalCentavos', i.total_centavos,
    'compraId', cid,
    'reservaEstado', r.estado,
    'reservaExpiresAt', r.expires_at
  );
END $function$;

CREATE OR REPLACE FUNCTION transporte.consultar_pago_cliente(p_reserva uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
DECLARE r transporte.reservas; resultado jsonb;
BEGIN
  r := transporte.reserva_autorizada(p_reserva);
  SELECT jsonb_build_object(
    'reserva', jsonb_build_object(
      'id', r.id, 'estado', r.estado, 'expires_at', r.expires_at, 'cantidad', r.cantidad,
      'total_centavos', r.total_centavos, 'cotizacion_version', r.cotizacion_version, 'aceptada_version', r.aceptada_version
    ),
    'viaje', (
      SELECT jsonb_build_object(
        'salida', v.salida + (po.minutos_desde_origen * interval '1 minute'),
        'llegada', v.salida + (pd.minutos_desde_origen * interval '1 minute'),
        'origen', co.nombre, 'destino', cd.nombre,
        'terminalOrigen', tor.nombre, 'terminalDestino', tde.nombre,
        'cooperativaId', c.id, 'cooperativa', c.nombre,
        'unidad', b.unidad, 'placa', b.placa, 'chasis', b.chasis, 'carroceria', b.carroceria,
        'servicio', g.nombre, 'pisos', pl.pisos
      )
      FROM transporte.viajes v
      JOIN transporte.frecuencias f ON f.id = v.frecuencia_id
      JOIN transporte.ruta_paradas po ON po.ruta_id = f.ruta_id AND po.orden = r.origen_orden
      JOIN transporte.ruta_paradas pd ON pd.ruta_id = f.ruta_id AND pd.orden = r.destino_orden
      JOIN transporte.terminales tor ON tor.id = po.terminal_id JOIN transporte.ciudades co ON co.id = tor.ciudad_id
      JOIN transporte.terminales tde ON tde.id = pd.terminal_id JOIN transporte.ciudades cd ON cd.id = tde.ciudad_id
      JOIN transporte.cooperativas c ON c.id = v.cooperativa_id JOIN transporte.buses b ON b.id = v.bus_id
      JOIN transporte.grupos_bus g ON g.id = b.grupo_id JOIN transporte.planos pl ON pl.id = v.plano_id
      WHERE v.id = r.viaje_id
    ),
    'cotizacion', (
      SELECT to_jsonb(q) - 'cooperativa_id'
      FROM transporte.cotizaciones q
      WHERE q.reserva_id = r.id AND q.version = coalesce(r.aceptada_version, r.cotizacion_version)
    ),
    'pasajeros', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'reservaAsientoId', a.id,
        'nombre', p.nombres || ' ' || p.apellidos,
        'documento', p.documento,
        'categoria', CASE p.tipo_pasajero WHEN 'NINO' THEN 'Niño' WHEN 'TERCERA_EDAD' THEN 'Tercera edad' WHEN 'DISCAPACIDAD' THEN 'Persona con discapacidad' ELSE 'Adulto' END,
        'asiento', pc.codigo, 'piso', pc.piso,
        'tarifaCentavos', cl.base_centavos, 'descuentoCentavos', cl.descuento_centavos,
        'servicioCentavos', cl.servicio_centavos, 'ivaCentavos', cl.iva_centavos, 'impuestoBp', cl.impuesto_bp
      ) ORDER BY pc.piso, pc.fila, pc.columna)
      FROM transporte.reserva_asientos a
      JOIN transporte.plano_celdas pc ON pc.id = a.asiento_id
      JOIN transporte.pasajeros p ON p.reserva_asiento_id = a.id
      LEFT JOIN transporte.cotizaciones q ON q.reserva_id = r.id AND q.version = coalesce(r.aceptada_version, r.cotizacion_version)
      LEFT JOIN transporte.cotizacion_lineas cl ON cl.cotizacion_id = q.id AND cl.reserva_asiento_id = a.id
      LEFT JOIN transporte.beneficios be ON be.id = cl.beneficio_id
      WHERE a.reserva_id = r.id
    ), '[]'::jsonb),
    'cuentas', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', a.id, 'banco', b.nombre, 'tipo', a.tipo, 'numero', a.numero,
        'titular', a.titular, 'ruc', a.documento_titular, 'qrArchivoId', a.qr_archivo_id
      ) ORDER BY b.nombre, a.id)
      FROM transporte.cuentas_bancarias a JOIN transporte.bancos b ON b.id = a.banco_id
      WHERE a.cooperativa_id = r.cooperativa_id AND a.activa AND b.activo
    ), '[]'::jsonb),
    'metodos', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', m.codigo, 'nombre', m.nombre, 'tipo', m.tipo,
        'habilitado', cfg.habilitado AND m.adaptador_disponible AND m.codigo IN ('BANCO', 'PAYPHONE'),
        'instrucciones', cfg.instrucciones
      ) ORDER BY m.nombre)
      FROM transporte.cooperativa_metodos_pago cfg JOIN transporte.metodos_pago m ON m.id = cfg.metodo_id
      WHERE cfg.cooperativa_id = r.cooperativa_id
    ), '[]'::jsonb),
    'politica', (
      SELECT jsonb_build_object('maxBytes', p.max_bytes, 'mimes', p.mimes, 'referenciaObligatoria', p.referencia_obligatoria)
      FROM transporte.politica_comprobantes p WHERE p.cooperativa_id = r.cooperativa_id
    ),
    'intento', (
      SELECT jsonb_build_object(
        'id', i.id, 'estado', i.estado, 'cuentaId', i.cuenta_id, 'cuentaSnapshot', i.cuenta_snapshot,
        'metodo', m.nombre, 'metodoCodigo', m.codigo, 'proveedorOrden', i.proveedor_orden, 'totalCentavos', i.total_centavos
      )
      FROM transporte.intentos_pago i JOIN transporte.metodos_pago m ON m.id = i.metodo_id
      WHERE i.reserva_id = r.id
      ORDER BY (i.estado IN ('PENDIENTE', 'EN_REVISION', 'APROBADO')) DESC, i.created_at DESC, i.id DESC
      LIMIT 1
    ),
    'comprobante', (
      SELECT jsonb_build_object(
        'id', c.id, 'estado', c.estado, 'motivo', c.motivo, 'referencia', c.referencia,
        'archivoId', a.id, 'bytes', a.bytes, 'mime', a.mime,
        'nombre', regexp_replace(a.ruta_privada, '^.*/', ''), 'version', c.version
      )
      FROM transporte.comprobantes c
      JOIN transporte.intentos_pago i ON i.id = c.intento_id
      JOIN transporte.archivos a ON a.id = c.archivo_id
      WHERE i.reserva_id = r.id
      ORDER BY (i.estado IN ('PENDIENTE', 'EN_REVISION', 'APROBADO')) DESC, i.created_at DESC, i.id DESC
      LIMIT 1
    ),
    'compra', (
      SELECT jsonb_build_object(
        'id', c.id, 'codigo', c.codigo, 'estado', c.estado,
        'totalPagadoCentavos', c.total_pagado_centavos, 'viajeSnapshot', c.viaje_snapshot
      )
      FROM transporte.compras c WHERE c.reserva_id = r.id
    ),
    'documento', (
      SELECT jsonb_build_object('id', b.id, 'qrId', b.qr_id, 'estado', b.estado, 'archivoId', b.archivo_id)
      FROM transporte.boletos b JOIN transporte.compras c ON c.id = b.compra_id
      WHERE c.reserva_id = r.id
    )
  ) INTO resultado;
  RETURN resultado;
END $function$;

-- 8. RF11 Abordaje QR: validación nula antes de exigir y función de consulta de boleto por QR
CREATE OR REPLACE FUNCTION transporte.registrar_abordaje(p_qr uuid, p_asiento_reserva uuid, p_clave text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
DECLARE
  b transporte.boletos;
  c transporte.compras;
  r transporte.reservas;
  v transporte.viajes;
  aid uuid;
BEGIN
  SELECT * INTO b FROM transporte.boletos WHERE qr_id = p_qr;
  IF b.id IS NULL THEN
    RAISE EXCEPTION 'Boleto no encontrado' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO c FROM transporte.compras WHERE id = b.compra_id;
  SELECT * INTO r FROM transporte.reservas WHERE id = c.reserva_id;
  SELECT * INTO v FROM transporte.viajes WHERE id = r.viaje_id;

  PERFORM transporte.exigir('abordaje.registrar', c.cooperativa_id);
  PERFORM 1 FROM transporte.compras WHERE id = c.id FOR UPDATE;

  IF b.estado <> 'LISTO' OR c.estado <> 'CONFIRMADA' OR v.estado NOT IN ('PUBLICADO', 'EN_RUTA')
     OR (v.conductor_id IS NOT NULL AND v.conductor_id <> transporte.actor() AND NOT transporte.puede('operacion.admin', c.cooperativa_id))
     OR NOT EXISTS(SELECT 1 FROM transporte.reserva_asientos WHERE id = p_asiento_reserva AND reserva_id = r.id AND estado = 'CONFIRMADO') THEN
    RAISE EXCEPTION 'Boleto/pasajero/viaje no valido';
  END IF;

  SELECT id INTO aid
  FROM transporte.abordajes
  WHERE clave_intento = p_clave AND compra_id = c.id AND reserva_asiento_id = p_asiento_reserva;
  IF aid IS NOT NULL THEN
    RETURN aid;
  END IF;

  INSERT INTO transporte.abordajes(cooperativa_id, compra_id, reserva_asiento_id, operador_id, clave_intento)
  VALUES(c.cooperativa_id, c.id, p_asiento_reserva, transporte.actor(), p_clave)
  RETURNING id INTO aid;
  RETURN aid;
END $function$;

CREATE OR REPLACE FUNCTION transporte.consultar_boleto_abordaje(p_qr uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
DECLARE
  b transporte.boletos;
  c transporte.compras;
  r transporte.reservas;
  v transporte.viajes;
  resultado jsonb;
BEGIN
  SELECT * INTO b FROM transporte.boletos WHERE qr_id = p_qr;
  IF b.id IS NULL THEN
    RAISE EXCEPTION 'Boleto no encontrado' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO c FROM transporte.compras WHERE id = b.compra_id;
  SELECT * INTO r FROM transporte.reservas WHERE id = c.reserva_id;
  SELECT * INTO v FROM transporte.viajes WHERE id = r.viaje_id;

  PERFORM transporte.exigir('abordaje.registrar', c.cooperativa_id);

  SELECT jsonb_build_object(
    'boleto', jsonb_build_object(
      'id', b.id,
      'qrId', b.qr_id,
      'estado', b.estado,
      'emitidoAt', b.emitido_at
    ),
    'compra', (
      SELECT jsonb_build_object(
        'id', c.id,
        'codigo', c.codigo,
        'estado', c.estado,
        'cooperativaId', co.id,
        'cooperativa', co.nombre,
        'origen', co_ori.nombre,
        'destino', co_des.nombre,
        'terminalOrigen', tor.nombre,
        'terminalDestino', tde.nombre,
        'salida', v.salida + (po.minutos_desde_origen * interval '1 minute'),
        'unidad', bu.unidad,
        'placa', bu.placa,
        'servicio', gb.nombre,
        'viajeEstado', v.estado
      )
      FROM transporte.cooperativas co
      JOIN transporte.frecuencias f ON f.id = v.frecuencia_id
      JOIN transporte.buses bu ON bu.id = v.bus_id
      JOIN transporte.grupos_bus gb ON gb.id = bu.grupo_id
      JOIN transporte.ruta_paradas po ON po.ruta_id = f.ruta_id AND po.orden = r.origen_orden
      JOIN transporte.ruta_paradas pd ON pd.ruta_id = f.ruta_id AND pd.orden = r.destino_orden
      JOIN transporte.terminales tor ON tor.id = po.terminal_id
      JOIN transporte.ciudades co_ori ON co_ori.id = tor.ciudad_id
      JOIN transporte.terminales tde ON tde.id = pd.terminal_id
      JOIN transporte.ciudades co_des ON co_des.id = tde.ciudad_id
      WHERE co.id = c.cooperativa_id
    ),
    'pasajeros', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'reservaAsientoId', a.id,
        'nombre', p.nombres || ' ' || p.apellidos,
        'documento', p.documento,
        'tipoDocumento', p.tipo_documento,
        'categoria', CASE p.tipo_pasajero
          WHEN 'NINO' THEN 'Niño'
          WHEN 'TERCERA_EDAD' THEN 'Tercera edad'
          WHEN 'DISCAPACIDAD' THEN 'Persona con discapacidad'
          ELSE 'Adulto'
        END,
        'asiento', pc.codigo,
        'piso', pc.piso,
        'estadoAsiento', a.estado,
        'abordado', ab.id IS NOT NULL,
        'escaneadoAt', ab.escaneado_at,
        'operador', CASE WHEN op.id IS NULL THEN NULL ELSE op.nombres || ' ' || op.apellidos END
      ) ORDER BY pc.piso, pc.fila, pc.columna)
      FROM transporte.reserva_asientos a
      JOIN transporte.plano_celdas pc ON pc.id = a.asiento_id
      JOIN transporte.pasajeros p ON p.reserva_asiento_id = a.id
      LEFT JOIN transporte.abordajes ab ON ab.reserva_asiento_id = a.id
      LEFT JOIN transporte.usuarios op ON op.id = ab.operador_id
      WHERE a.reserva_id = r.id
    ), '[]'::jsonb)
  ) INTO resultado;

  RETURN resultado;
END $function$;

-- 9. emitir_sesion_autenticada con IP y User-Agent opcionales sin ambigüedad de sobrecarga
DROP FUNCTION IF EXISTS transporte.emitir_sesion_autenticada(uuid, text, timestamptz);
CREATE OR REPLACE FUNCTION transporte.emitir_sesion_autenticada(
  p_usuario uuid,
  p_token_hash text,
  p_expires timestamptz,
  p_ip inet DEFAULT NULL::inet,
  p_user_agent text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'transporte'
AS $function$
DECLARE sid uuid;
BEGIN
  IF NOT transporte.email_activado(p_usuario) THEN
    RAISE EXCEPTION 'Activa tu cuenta antes de iniciar sesion' USING ERRCODE = 'PAV02';
  END IF;
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' OR p_expires IS NULL
     OR p_expires <= now() OR p_expires > now() + interval '30 days' THEN
    RAISE EXCEPTION 'Sesion invalida';
  END IF;
  INSERT INTO transporte.sesiones(usuario_id, token_hash, expires_at, ip, user_agent)
  VALUES(p_usuario, p_token_hash, p_expires, p_ip, left(nullif(trim(coalesce(p_user_agent, '')), ''), 300))
  RETURNING id INTO sid;
  RETURN sid;
END $function$;

-- 10. Catálogo público, imágenes de flota/logo, cruce de medianoche y consulta por lote de clases
CREATE OR REPLACE FUNCTION transporte.compra_viaje_datos(p_id uuid, p_origen integer, p_destino integer)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
  SELECT jsonb_build_object(
    'viaje_id', v.id,
    'cooperativa', co.nombre,
    'cooperativa_id', co.id,
    'cooperativa_logo_url', CASE
      WHEN k.logo_archivo_id IS NOT NULL THEN '/api/publico/cooperativas/' || co.id::text || '/logo'
      ELSE NULL
    END,
    'tipo_viaje', f.tipo_viaje,
    'salida', v.salida + po.minutos_desde_origen * interval '1 minute',
    'llegada', v.salida + pd.minutos_desde_origen * interval '1 minute',
    'origen_orden', po.orden,
    'destino_orden', pd.orden,
    'origen', jsonb_build_object('orden', po.orden, 'ciudad_id', ci.id, 'ciudad', ci.nombre, 'terminal', to1.nombre),
    'destino', jsonb_build_object('orden', pd.orden, 'ciudad_id', cd.id, 'ciudad', cd.nombre, 'terminal', td.nombre),
    'bus', jsonb_build_object(
      'id', b.id,
      'unidad', b.unidad,
      'placa', b.placa,
      'chasis', b.chasis,
      'carroceria', b.carroceria,
      'grupo', g.nombre,
      'plano_id', v.plano_id,
      'pisos', pl.pisos,
      'foto_url', (
        SELECT '/api/publico/imagenes/' || bf.archivo_id::text
        FROM transporte.bus_fotos bf
        JOIN transporte.archivos af ON af.id = bf.archivo_id
        WHERE bf.bus_id = b.id AND af.categoria = 'FOTO_BUS' AND af.validado_servidor
        ORDER BY bf.orden, bf.created_at, bf.id
        LIMIT 1
      ),
      'carroceria_modelo', null,
      'servicios', coalesce((
        SELECT jsonb_agg(e.codigo ORDER BY e.codigo)
        FROM transporte.bus_equipamiento be
        JOIN transporte.equipamientos e ON e.id = be.equipamiento_id
        WHERE be.bus_id = b.id
      ), '[]'::jsonb)
    ),
    'clases', coalesce((
      SELECT jsonb_agg(DISTINCT cl.codigo)
      FROM transporte.tarifas t
      JOIN transporte.clases_asiento cl ON cl.id = t.clase_id
      WHERE t.frecuencia_id = f.id AND t.grupo_id = b.grupo_id
        AND t.origen_orden = po.orden AND t.destino_orden = pd.orden
        AND t.activa AND t.vigencia @> (v.salida AT TIME ZONE 'America/Guayaquil')::date
    ), '[]'::jsonb),
    'paradas', (
      SELECT jsonb_agg(jsonb_build_object(
        'orden', rp.orden,
        'terminal', te.nombre,
        'ciudad', ct.nombre,
        'hora', v.salida + rp.minutos_desde_origen * interval '1 minute'
      ) ORDER BY rp.orden)
      FROM transporte.ruta_paradas rp
      JOIN transporte.terminales te ON te.id = rp.terminal_id
      JOIN transporte.ciudades ct ON ct.id = te.ciudad_id
      WHERE rp.ruta_id = f.ruta_id
    )
  )
  FROM transporte.viajes v
  JOIN transporte.frecuencias f ON f.id = v.frecuencia_id
  JOIN transporte.buses b ON b.id = v.bus_id
  JOIN transporte.cooperativas co ON co.id = v.cooperativa_id
  LEFT JOIN transporte.config_cooperativa k ON k.cooperativa_id = co.id
  JOIN transporte.grupos_bus g ON g.id = b.grupo_id
  JOIN transporte.planos pl ON pl.id = v.plano_id
  JOIN transporte.ruta_paradas po ON po.ruta_id = f.ruta_id AND po.orden = p_origen
  JOIN transporte.ruta_paradas pd ON pd.ruta_id = f.ruta_id AND pd.orden = p_destino
  JOIN transporte.terminales to1 ON to1.id = po.terminal_id JOIN transporte.ciudades ci ON ci.id = to1.ciudad_id
  JOIN transporte.terminales td ON td.id = pd.terminal_id JOIN transporte.ciudades cd ON cd.id = td.ciudad_id
  WHERE v.id = p_id;
$function$;

CREATE OR REPLACE FUNCTION transporte.compra_buscar(p jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
  WITH candidatos AS (
    SELECT
      v.id,
      po.orden o,
      pd.orden d,
      co.nombre coop,
      v.salida + po.minutos_desde_origen * interval '1 minute' salida,
      x.libres,
      tf.precio
    FROM transporte.viajes v
    JOIN transporte.cooperativas co ON co.id = v.cooperativa_id
    JOIN transporte.frecuencias f ON f.id = v.frecuencia_id
    JOIN transporte.buses b ON b.id = v.bus_id
    JOIN transporte.ruta_paradas po ON po.ruta_id = f.ruta_id
    JOIN transporte.terminales tor ON tor.id = po.terminal_id
    JOIN transporte.ruta_paradas pd ON pd.ruta_id = f.ruta_id
    JOIN transporte.terminales tde ON tde.id = pd.terminal_id
    CROSS JOIN LATERAL (
      SELECT count(*) libres
      FROM transporte.plano_celdas pc
      JOIN transporte.clases_asiento cla ON cla.id = pc.clase_id
      WHERE pc.plano_id = v.plano_id AND pc.tipo = 'ASIENTO' AND pc.activa
        AND (nullif(p->>'clase', '') IS NULL OR cla.codigo = p->>'clase')
        AND NOT EXISTS (
          SELECT 1 FROM transporte.reserva_asientos a
          WHERE a.viaje_id = v.id AND a.asiento_id = pc.id
            AND (a.estado = 'CONFIRMADO' OR (a.estado = 'RETENIDO' AND a.expires_at > now()))
            AND int4range(a.origen_orden, a.destino_orden, '[)') && int4range(least(po.orden, pd.orden), greatest(po.orden, pd.orden), '[)')
        )
    ) x
    CROSS JOIN LATERAL (
      SELECT min(t.precio_centavos) precio
      FROM transporte.tarifas t
      JOIN transporte.clases_asiento cl ON cl.id = t.clase_id
      WHERE t.frecuencia_id = f.id AND t.grupo_id = b.grupo_id
        AND t.origen_orden = po.orden AND t.destino_orden = pd.orden AND t.activa
        AND t.vigencia @> (v.salida AT TIME ZONE 'America/Guayaquil')::date
        AND (nullif(p->>'clase', '') IS NULL OR cl.codigo = p->>'clase')
    ) tf
    WHERE v.estado = 'PUBLICADO'
      AND co.activa AND f.activa AND b.activo
      AND v.salida >= (((p->>'fecha')::date - interval '1 day')::timestamp AT TIME ZONE 'America/Guayaquil')
      AND v.salida < (((p->>'fecha')::date + interval '2 days')::timestamp AT TIME ZONE 'America/Guayaquil')
      AND (v.salida + po.minutos_desde_origen * interval '1 minute') > now()
      AND ((v.salida + po.minutos_desde_origen * interval '1 minute') AT TIME ZONE 'America/Guayaquil')::date = (p->>'fecha')::date
      AND tor.ciudad_id = (p->>'origen')::uuid
      AND tde.ciudad_id = (p->>'destino')::uuid
      AND po.orden < pd.orden
      AND (
        f.tipo_viaje = 'CON_PARADAS'
        OR (
          po.orden = (SELECT min(orden) FROM transporte.ruta_paradas WHERE ruta_id = f.ruta_id)
          AND pd.orden = (SELECT max(orden) FROM transporte.ruta_paradas WHERE ruta_id = f.ruta_id)
        )
      )
      AND (nullif(p->>'cooperativa', '') IS NULL OR co.id = (p->>'cooperativa')::uuid)
      AND (nullif(p->>'tipo_viaje', '') IS NULL OR f.tipo_viaje = p->>'tipo_viaje')
      AND (nullif(p->>'chasis', '') IS NULL OR b.chasis ILIKE '%' || (p->>'chasis') || '%')
      AND (nullif(p->>'carroceria', '') IS NULL OR b.carroceria ILIKE '%' || (p->>'carroceria') || '%')
      AND x.libres >= (p->>'cantidad')::integer
      AND tf.precio IS NOT NULL
  ),
  filtrados AS (
    SELECT *, row_number() OVER (ORDER BY CASE WHEN p->>'orden' = 'precio' THEN precio END, salida, id, o, d) rn
    FROM candidatos
    WHERE (nullif(p->>'precio_min', '') IS NULL OR precio >= (p->>'precio_min')::bigint)
      AND (nullif(p->>'precio_max', '') IS NULL OR precio <= (p->>'precio_max')::bigint)
      AND (
        nullif(p->>'hora', '') IS NULL OR CASE p->>'hora'
          WHEN 'MADRUGADA' THEN extract(hour FROM salida AT TIME ZONE 'America/Guayaquil') < 6
          WHEN 'MANANA' THEN extract(hour FROM salida AT TIME ZONE 'America/Guayaquil') >= 6 AND extract(hour FROM salida AT TIME ZONE 'America/Guayaquil') < 12
          WHEN 'TARDE' THEN extract(hour FROM salida AT TIME ZONE 'America/Guayaquil') >= 12 AND extract(hour FROM salida AT TIME ZONE 'America/Guayaquil') < 18
          WHEN 'NOCHE' THEN extract(hour FROM salida AT TIME ZONE 'America/Guayaquil') >= 18
          ELSE false
        END
      )
  ),
  pagina AS (
    SELECT * FROM filtrados WHERE rn > coalesce((p->>'cursor')::integer, 0) ORDER BY rn LIMIT 12
  )
  SELECT jsonb_build_object(
    'data', coalesce((
      SELECT jsonb_agg(
        transporte.compra_viaje_datos(id, o, d) || jsonb_build_object('plazas_disponibles', libres, 'tarifa_desde_centavos', precio)
        ORDER BY rn
      ) FROM pagina
    ), '[]'::jsonb),
    'next_cursor', CASE WHEN (SELECT max(rn) FROM filtrados) > (SELECT max(rn) FROM pagina) THEN (SELECT max(rn)::text FROM pagina) ELSE NULL END
  );
$function$;

CREATE OR REPLACE FUNCTION transporte.compra_detalle(p_id uuid, p_o integer, p_d integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
DECLARE
  v transporte.viajes;
  f transporte.frecuencias;
  o integer;
  d integer;
  datos jsonb;
  v_mapa jsonb;
BEGIN
  SELECT * INTO v FROM transporte.viajes WHERE id = p_id AND estado = 'PUBLICADO' AND salida > now();
  IF v.id IS NULL THEN
    RAISE EXCEPTION 'Viaje no disponible' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO f FROM transporte.frecuencias WHERE id = v.frecuencia_id;
  IF NOT f.activa
     OR NOT EXISTS(SELECT 1 FROM transporte.buses WHERE id = v.bus_id AND activo)
     OR NOT EXISTS(SELECT 1 FROM transporte.cooperativas WHERE id = v.cooperativa_id AND activa) THEN
    RAISE EXCEPTION 'Viaje no disponible' USING ERRCODE = 'P0002';
  END IF;
  SELECT coalesce(p_o, min(orden)), coalesce(p_d, max(orden)) INTO o, d
  FROM transporte.ruta_paradas WHERE ruta_id = f.ruta_id;
  IF o >= d OR (
    f.tipo_viaje = 'DIRECTO' AND (
      o <> (SELECT min(orden) FROM transporte.ruta_paradas WHERE ruta_id = f.ruta_id)
      OR d <> (SELECT max(orden) FROM transporte.ruta_paradas WHERE ruta_id = f.ruta_id)
    )
  ) THEN
    RAISE EXCEPTION 'Tramo no valido';
  END IF;
  datos := transporte.compra_viaje_datos(p_id, o, d);
  IF datos IS NULL THEN
    RAISE EXCEPTION 'Tramo no valido';
  END IF;
  v_mapa := transporte.plano_disponible(p_id, o, d);
  RETURN datos || jsonb_build_object(
    'mapa', v_mapa,
    'plazas_disponibles', (
      SELECT count(*) FROM jsonb_array_elements(v_mapa->'celdas') c
      WHERE c->>'tipo' = 'ASIENTO' AND c->>'estado' = 'DISPONIBLE'
    ),
    'tarifa_desde_centavos', (
      SELECT min(precio_centavos)
      FROM transporte.tarifas
      WHERE frecuencia_id = f.id
        AND grupo_id = (SELECT grupo_id FROM transporte.buses WHERE id = v.bus_id)
        AND origen_orden = o AND destino_orden = d AND activa
        AND vigencia @> (v.salida AT TIME ZONE 'America/Guayaquil')::date
    )
  );
END $function$;

CREATE OR REPLACE FUNCTION transporte.disponibilidad_clases_viajes(
  p_viajes uuid[],
  p_origenes integer[],
  p_destinos integer[]
)
RETURNS TABLE(
  viaje_id uuid,
  origen_orden integer,
  destino_orden integer,
  disponibles_normal integer,
  disponibles_vip integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
  WITH solicitud AS (
    SELECT t.vid AS viaje_id, t.orig AS origen_orden, t.dest AS destino_orden
    FROM unnest(p_viajes, p_origenes, p_destinos) AS t(vid, orig, dest)
  )
  SELECT
    s.viaje_id,
    s.origen_orden,
    s.destino_orden,
    coalesce(count(*) FILTER (WHERE upper(coalesce(cl.codigo, 'NORMAL')) = 'NORMAL'), 0)::integer AS disponibles_normal,
    coalesce(count(*) FILTER (WHERE upper(coalesce(cl.codigo, '')) = 'VIP'), 0)::integer AS disponibles_vip
  FROM solicitud s
  JOIN transporte.viajes v ON v.id = s.viaje_id AND v.estado = 'PUBLICADO'
  JOIN transporte.plano_celdas pc ON pc.plano_id = v.plano_id AND pc.tipo = 'ASIENTO' AND pc.activa
  LEFT JOIN transporte.clases_asiento cl ON cl.id = pc.clase_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM transporte.reserva_asientos a
    WHERE a.viaje_id = v.id
      AND a.asiento_id = pc.id
      AND (a.estado = 'CONFIRMADO' OR (a.estado = 'RETENIDO' AND a.expires_at > now()))
      AND int4range(a.origen_orden, a.destino_orden, '[)') && int4range(least(s.origen_orden, s.destino_orden), greatest(s.origen_orden, s.destino_orden), '[)')
  )
  GROUP BY s.viaje_id, s.origen_orden, s.destino_orden;
$function$;

CREATE OR REPLACE FUNCTION transporte.logo_publico_cooperativa(p_coop uuid)
RETURNS TABLE(mime text, contenido bytea, sha256 text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
  SELECT a.mime, fi.contenido, a.sha256::text
  FROM transporte.cooperativas c
  JOIN transporte.config_cooperativa k ON k.cooperativa_id = c.id
  JOIN transporte.archivos a ON a.id = k.logo_archivo_id
  JOIN transporte.flota_imagen_contenidos fi ON fi.archivo_id = a.id
  WHERE c.id = p_coop AND c.activa AND a.categoria = 'LOGO' AND a.validado_servidor
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION transporte.imagen_publica_flota(p_archivo uuid)
RETURNS TABLE(mime text, contenido bytea, sha256 text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
  SELECT a.mime, fi.contenido, a.sha256::text
  FROM transporte.bus_fotos bf
  JOIN transporte.buses b ON b.id = bf.bus_id
  JOIN transporte.cooperativas c ON c.id = b.cooperativa_id
  JOIN transporte.archivos a ON a.id = bf.archivo_id
  JOIN transporte.flota_imagen_contenidos fi ON fi.archivo_id = a.id
  WHERE bf.archivo_id = p_archivo AND b.activo AND c.activa AND a.categoria = 'FOTO_BUS' AND a.validado_servidor
  LIMIT 1;
$function$;

-- 11. Mantenimiento de expiraciones, sesiones vencidas y tokens antiguos
CREATE OR REPLACE FUNCTION transporte.mantener_expiraciones_y_sesiones()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
DECLARE
  vid uuid;
  v_reservas integer := 0;
  v_sesiones integer := 0;
  v_tokens integer := 0;
BEGIN
  FOR vid IN
    SELECT DISTINCT viaje_id
    FROM transporte.reservas
    WHERE estado = 'PENDIENTE' AND expires_at <= now()
    ORDER BY viaje_id
  LOOP
    v_reservas := v_reservas + transporte.expirar_reservas(vid);
  END LOOP;

  DELETE FROM transporte.sesiones
  WHERE expires_at <= now() - interval '7 days'
     OR (revocada_at IS NOT NULL AND revocada_at <= now() - interval '7 days');
  GET DIAGNOSTICS v_sesiones = ROW_COUNT;

  DELETE FROM transporte.tokens_identidad
  WHERE expires_at <= now() - interval '7 days'
     OR (consumido_at IS NOT NULL AND consumido_at <= now() - interval '7 days');
  GET DIAGNOSTICS v_tokens = ROW_COUNT;

  RETURN jsonb_build_object(
    'reservasExpiradas', v_reservas,
    'sesionesEliminadas', v_sesiones,
    'tokensEliminados', v_tokens
  );
END $function$;

-- 12. Trigger de auditoría compatible con tablas sin columna id (ej. usuario_permisos)
CREATE OR REPLACE FUNCTION transporte.tg_auditar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'transporte', 'pg_catalog'
AS $function$
DECLARE rowj jsonb := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
BEGIN
  INSERT INTO transporte.auditoria(actor_id, cooperativa_id, entidad, entidad_id, accion, request_id, datos)
  VALUES (
    transporte.actor(),
    nullif(rowj->>'cooperativa_id', '')::uuid,
    TG_TABLE_NAME,
    coalesce(nullif(rowj->>'id', ''), nullif(rowj->>'membresia_id', ''))::uuid,
    TG_OP,
    nullif(current_setting('app.request_id', true), ''),
    jsonb_build_object('version', rowj->'version', 'estado', rowj->'estado')
  );
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS act_provincias ON transporte.provincias;
CREATE TRIGGER act_provincias
  BEFORE UPDATE ON transporte.provincias
  FOR EACH ROW EXECUTE FUNCTION transporte.tg_actualizar();

DROP TRIGGER IF EXISTS act_marcas_bus ON transporte.marcas_bus;
CREATE TRIGGER act_marcas_bus
  BEFORE UPDATE ON transporte.marcas_bus
  FOR EACH ROW EXECUTE FUNCTION transporte.tg_actualizar();

DROP TRIGGER IF EXISTS aud_usuario_permisos ON transporte.usuario_permisos;
CREATE TRIGGER aud_usuario_permisos
  AFTER INSERT OR UPDATE OR DELETE ON transporte.usuario_permisos
  FOR EACH ROW EXECUTE FUNCTION transporte.tg_auditar();

DROP TRIGGER IF EXISTS aud_provincias ON transporte.provincias;
CREATE TRIGGER aud_provincias
  AFTER INSERT OR UPDATE OR DELETE ON transporte.provincias
  FOR EACH ROW EXECUTE FUNCTION transporte.tg_auditar();

DROP TRIGGER IF EXISTS aud_marcas_bus ON transporte.marcas_bus;
CREATE TRIGGER aud_marcas_bus
  AFTER INSERT OR UPDATE OR DELETE ON transporte.marcas_bus
  FOR EACH ROW EXECUTE FUNCTION transporte.tg_auditar();

-- 13. Índices faltantes de rendimiento y mantenimiento
CREATE INDEX IF NOT EXISTS sesiones_usuario_activas_idx
  ON transporte.sesiones (usuario_id, expires_at) WHERE revocada_at IS NULL;

CREATE INDEX IF NOT EXISTS sesiones_expiracion_idx
  ON transporte.sesiones (expires_at);

CREATE INDEX IF NOT EXISTS tokens_identidad_limpieza_idx
  ON transporte.tokens_identidad (expires_at);

CREATE INDEX IF NOT EXISTS intentos_pago_payphone_orden_idx
  ON transporte.intentos_pago (proveedor_orden, actor_id, created_at DESC)
  WHERE proveedor_orden IS NOT NULL;

CREATE INDEX IF NOT EXISTS reserva_asientos_viaje_estado_idx
  ON transporte.reserva_asientos (viaje_id, estado, expires_at);

CREATE INDEX IF NOT EXISTS abordajes_compra_idx
  ON transporte.abordajes (compra_id);

CREATE INDEX IF NOT EXISTS bus_fotos_bus_orden_idx
  ON transporte.bus_fotos (bus_id, orden, created_at, id);

CREATE INDEX IF NOT EXISTS boletos_estado_idx
  ON transporte.boletos (estado) WHERE estado <> 'LISTO';

CREATE INDEX IF NOT EXISTS solicitudes_reembolso_compra_created_idx
  ON transporte.solicitudes_reembolso (compra_id, created_at DESC);

-- 14. Privilegios estrictos de ejecución
REVOKE ALL ON FUNCTION transporte.puede(text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.puede(text, uuid, uuid) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.puede_en_reserva(text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.puede_en_reserva(text, uuid, uuid) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.reserva_autorizada(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.reserva_autorizada(uuid) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.reserva_visible(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.reserva_visible(uuid) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.marcar_boleto_emitido(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.marcar_boleto_emitido(uuid, uuid) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.asignar_entrega_boleto(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.asignar_entrega_boleto(uuid, text) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.registrar_comprobante(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.registrar_comprobante(uuid, uuid, text) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.expirar_reservas(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.expirar_reservas(uuid) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.registrar_paradero_local(uuid, uuid, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.registrar_paradero_local(uuid, uuid, text, text, text, text, text) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.guardar_pasajero(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.guardar_pasajero(uuid, jsonb) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.cotizar(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.cotizar(uuid) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.aceptar_cotizacion(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.aceptar_cotizacion(uuid, integer) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.crear_intento_pago(uuid, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.crear_intento_pago(uuid, text, uuid, text) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.confirmar_compra_interna(uuid, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.confirmar_compra_interna(uuid, bigint) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.decidir_comprobante(uuid, boolean, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.decidir_comprobante(uuid, boolean, text, integer) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.restablecer_password(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.restablecer_password(text, text) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.identidad_asignar_rol(uuid, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.identidad_asignar_rol(uuid, integer, jsonb) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.buscar_intento_payphone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.buscar_intento_payphone(text) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.consultar_pago_cliente(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.consultar_pago_cliente(uuid) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.registrar_abordaje(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.registrar_abordaje(uuid, uuid, text) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.consultar_boleto_abordaje(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.consultar_boleto_abordaje(uuid) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.emitir_sesion_autenticada(uuid, text, timestamptz, inet, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.emitir_sesion_autenticada(uuid, text, timestamptz, inet, text) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.compra_viaje_datos(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.compra_viaje_datos(uuid, integer, integer) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.compra_buscar(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.compra_buscar(jsonb) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.compra_detalle(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.compra_detalle(uuid, integer, integer) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.disponibilidad_clases_viajes(uuid[], integer[], integer[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.disponibilidad_clases_viajes(uuid[], integer[], integer[]) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.logo_publico_cooperativa(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.logo_publico_cooperativa(uuid) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.imagen_publica_flota(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.imagen_publica_flota(uuid) TO transporte_runtime;

REVOKE ALL ON FUNCTION transporte.mantener_expiraciones_y_sesiones() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.mantener_expiraciones_y_sesiones() TO transporte_runtime;

COMMIT;
