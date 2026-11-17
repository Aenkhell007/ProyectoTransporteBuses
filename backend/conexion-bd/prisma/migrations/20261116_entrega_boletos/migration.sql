BEGIN;
-- Cola de boletos independiente de activaciones y bienvenidas. Solo consume
-- compras confirmadas con documento ya emitido y desde un corte explícito.
CREATE FUNCTION transporte.reclamar_entrega_boleto(p_canal text,p_desde timestamptz)
RETURNS TABLE(notificacion_id uuid,canal text,compra_id uuid,codigo text,email text,telefono text,archivo_clave text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE elegida uuid;
BEGIN
 IF p_canal NOT IN('EMAIL','WHATSAPP') OR p_desde IS NULL THEN RAISE EXCEPTION 'Canal/corte inválido'; END IF;
 SELECT n.id INTO elegida FROM transporte.notificaciones n
 JOIN transporte.compras c ON c.id=(n.payload->>'compraId')::uuid AND c.estado='CONFIRMADA'
 JOIN transporte.boletos b ON b.compra_id=c.id AND b.estado='LISTO'
 WHERE n.tipo='COMPRA_CONFIRMADA' AND n.canal=p_canal AND n.created_at>=p_desde
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
CREATE FUNCTION transporte.finalizar_entrega_boleto(p_id uuid,p_exito boolean,p_ref text,p_error text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 UPDATE transporte.notificaciones SET estado=CASE WHEN p_exito THEN 'ENVIADA' ELSE 'FALLIDA' END,
 proveedor_ref=left(p_ref,500),error_codigo=CASE WHEN p_exito THEN NULL ELSE left(p_error,80) END,disponible_at=now()+interval '60 seconds'
 WHERE id=p_id AND tipo='COMPRA_CONFIRMADA' AND canal IN('EMAIL','WHATSAPP') AND estado='EN_PROCESO';
END $$;
REVOKE ALL ON FUNCTION transporte.reclamar_entrega_boleto(text,timestamptz),transporte.finalizar_entrega_boleto(uuid,boolean,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.reclamar_entrega_boleto(text,timestamptz),transporte.finalizar_entrega_boleto(uuid,boolean,text,text) TO transporte_runtime;
COMMIT;
