BEGIN;

-- Una instalación que ya recibió la auditoría integral conserva sus reglas más estrictas.
DO $migracion$
BEGIN
  IF to_regprocedure('transporte.puede_en_reserva(text,uuid,uuid)') IS NOT NULL THEN
    RETURN;
  END IF;

  CREATE OR REPLACE FUNCTION transporte.marcar_boleto_emitido(p_compra uuid, p_archivo uuid)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $emitir$
  DECLARE
    c transporte.compras;
    r transporte.reservas;
    cliente_payphone boolean;
  BEGIN
    SELECT * INTO c FROM transporte.compras WHERE id = p_compra FOR UPDATE;
    IF c.id IS NULL OR c.estado <> 'CONFIRMADA' THEN
      RAISE EXCEPTION 'Compra no emitible';
    END IF;
    SELECT * INTO r FROM transporte.reservas WHERE id = c.reserva_id;
    cliente_payphone := r.cliente_id = transporte.actor() AND EXISTS (
      SELECT 1 FROM transporte.pagos p
      JOIN transporte.intentos_pago i ON i.id = p.intento_id
      JOIN transporte.metodos_pago m ON m.id = i.metodo_id
      WHERE p.id = c.pago_id AND m.codigo = 'PAYPHONE' AND i.estado = 'APROBADO'
    );
    IF NOT coalesce(cliente_payphone, false) THEN
      PERFORM transporte.exigir('pagos.revisar', c.cooperativa_id);
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM transporte.archivos
      WHERE id = p_archivo AND cooperativa_id = c.cooperativa_id
        AND categoria = 'DOCUMENTO' AND mime = 'application/pdf' AND validado_servidor
        AND (NOT coalesce(cliente_payphone, false) OR propietario_id = transporte.actor())
    ) THEN
      RAISE EXCEPTION 'Documento privado no valido';
    END IF;
    UPDATE transporte.boletos
    SET estado = 'LISTO', archivo_id = p_archivo, emitido_at = now()
    WHERE compra_id = c.id;
  END;
  $emitir$;

  CREATE OR REPLACE FUNCTION transporte.asignar_entrega_boleto(p_compra uuid, p_backend text)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $entregar$
  DECLARE
    c transporte.compras;
    r transporte.reservas;
    cliente_payphone boolean;
  BEGIN
    SELECT * INTO c FROM transporte.compras WHERE id = p_compra;
    SELECT * INTO r FROM transporte.reservas WHERE id = c.reserva_id;
    cliente_payphone := c.estado = 'CONFIRMADA' AND r.cliente_id = transporte.actor() AND EXISTS (
      SELECT 1 FROM transporte.pagos p
      JOIN transporte.intentos_pago i ON i.id = p.intento_id
      JOIN transporte.metodos_pago m ON m.id = i.metodo_id
      WHERE p.id = c.pago_id AND m.codigo = 'PAYPHONE' AND i.estado = 'APROBADO'
    );
    IF c.id IS NULL OR length(coalesce(p_backend, '')) < 8 OR NOT (
      transporte.puede('pagos.revisar', r.cooperativa_id, r.oficina_id)
      OR transporte.puede('oficina.vender', r.cooperativa_id, r.oficina_id)
      OR coalesce(cliente_payphone, false)
    ) OR NOT EXISTS (
      SELECT 1 FROM transporte.boletos b
      JOIN transporte.archivos a ON a.id = b.archivo_id
      WHERE b.compra_id = c.id AND b.estado = 'LISTO' AND a.propietario_id = transporte.actor()
    ) THEN
      RAISE EXCEPTION 'Emisión no autorizada' USING ERRCODE = '42501';
    END IF;
    UPDATE transporte.notificaciones
      SET payload = payload || jsonb_build_object('backendId', p_backend)
      WHERE tipo = 'COMPRA_CONFIRMADA' AND payload->>'compraId' = p_compra::text
        AND estado = 'PENDIENTE' AND NOT payload ? 'backendId';
  END;
  $entregar$;
END;
$migracion$;

COMMIT;
