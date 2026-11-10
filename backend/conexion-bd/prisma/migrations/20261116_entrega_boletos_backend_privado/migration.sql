BEGIN;
-- Un archivo privado no es compartido entre los computadores del equipo.
DROP FUNCTION transporte.reclamar_entrega_boleto(text,timestamptz);
CREATE FUNCTION transporte.reclamar_entrega_boleto(p_canal text,p_desde timestamptz,p_backend text)
RETURNS TABLE(notificacion_id uuid,canal text,compra_id uuid,codigo text,email text,telefono text,archivo_clave text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE elegida uuid;
BEGIN
 IF p_canal NOT IN('EMAIL','WHATSAPP') OR p_desde IS NULL OR length(coalesce(p_backend,''))<8 THEN RAISE EXCEPTION 'Canal/corte inválido'; END IF;
 SELECT n.id INTO elegida FROM transporte.notificaciones n
 JOIN transporte.compras c ON c.id=(n.payload->>'compraId')::uuid AND c.estado='CONFIRMADA'
 JOIN transporte.boletos b ON b.compra_id=c.id AND b.estado='LISTO'
 WHERE n.tipo='COMPRA_CONFIRMADA' AND n.canal=p_canal AND n.created_at>=p_desde AND n.payload->>'backendId'=p_backend
 AND (n.estado='PENDIENTE' OR(n.estado='FALLIDA' AND n.error_codigo='REINTENTABLE' AND n.created_at>now()-interval '10 minutes'))
 AND n.intentos<3 AND n.disponible_at<=now() ORDER BY n.created_at,n.id FOR UPDATE OF n SKIP LOCKED LIMIT 1;
 IF elegida IS NULL THEN RETURN; END IF;
 UPDATE transporte.notificaciones SET estado='EN_PROCESO',intentos=intentos+1 WHERE id=elegida;
 RETURN QUERY SELECT n.id,n.canal,c.id,c.codigo::text,coalesce(nullif(r.contacto_email,''),u.email)::text,
 coalesce(nullif(r.contacto_telefono,''),u.telefono)::text,a.ruta_privada
 FROM transporte.notificaciones n JOIN transporte.compras c ON c.id=(n.payload->>'compraId')::uuid
 JOIN transporte.reservas r ON r.id=c.reserva_id JOIN transporte.usuarios u ON u.id=r.cliente_id
 JOIN transporte.boletos b ON b.compra_id=c.id JOIN transporte.archivos a ON a.id=b.archivo_id WHERE n.id=elegida;
END $$;
CREATE FUNCTION transporte.asignar_entrega_boleto(p_compra uuid,p_backend text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE c transporte.compras; r transporte.reservas;
BEGIN
 SELECT * INTO c FROM transporte.compras WHERE id=p_compra; SELECT * INTO r FROM transporte.reservas WHERE id=c.reserva_id;
 IF c.id IS NULL OR length(coalesce(p_backend,''))<8 OR NOT(
   transporte.puede('pagos.revisar',r.cooperativa_id,r.oficina_id) OR transporte.puede('oficina.vender',r.cooperativa_id,r.oficina_id))
   OR NOT EXISTS(SELECT 1 FROM transporte.boletos b JOIN transporte.archivos a ON a.id=b.archivo_id
     WHERE b.compra_id=c.id AND b.estado='LISTO' AND a.propietario_id=transporte.actor()) THEN
   RAISE EXCEPTION 'Emisión no autorizada' USING ERRCODE='42501';
 END IF;
 UPDATE transporte.notificaciones SET payload=payload||jsonb_build_object('backendId',p_backend)
 WHERE tipo='COMPRA_CONFIRMADA' AND payload->>'compraId'=p_compra::text AND estado='PENDIENTE' AND NOT payload ? 'backendId';
END $$;
REVOKE ALL ON FUNCTION transporte.reclamar_entrega_boleto(text,timestamptz,text),transporte.asignar_entrega_boleto(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.reclamar_entrega_boleto(text,timestamptz,text),transporte.asignar_entrega_boleto(uuid,text) TO transporte_runtime;
COMMIT;
