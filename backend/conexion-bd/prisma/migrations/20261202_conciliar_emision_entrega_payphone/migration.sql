BEGIN;

-- Conserva los permisos por reserva de la auditoría y las validaciones de PayPhone.
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
    WHERE p.id = c.pago_id AND m.codigo = 'PAYPHONE' AND i.estado = 'APROBADO'
  ) AND coalesce(r.cliente_id = transporte.actor(), false)
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
      AND (NOT es_payphone_cliente OR propietario_id = transporte.actor())
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
      WHERE p.id = c.pago_id AND m.codigo = 'PAYPHONE' AND i.estado = 'APROBADO'
    ) AND coalesce(r.cliente_id = transporte.actor(), false)
    INTO es_payphone_cliente;
  END IF;

  IF c.id IS NULL OR r.id IS NULL OR c.estado <> 'CONFIRMADA' OR length(coalesce(p_backend, '')) < 8 OR NOT (
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

COMMIT;
