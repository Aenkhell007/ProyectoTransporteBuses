-- Activación obligatoria. No borra usuarios ni verifica cuentas automáticamente.
CREATE OR REPLACE FUNCTION transporte.email_activado(p_usuario uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,transporte AS $$
 SELECT EXISTS(SELECT 1 FROM transporte.usuarios WHERE id=p_usuario AND activo AND email_verificado_at IS NOT NULL)
$$;

CREATE OR REPLACE FUNCTION transporte.solicitar_activacion(p_email text,p_hash text)
RETURNS TABLE(destinatario text,nombre text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,transporte AS $$
DECLARE u transporte.usuarios;
BEGIN
 IF p_hash IS NULL OR p_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Token no valido'; END IF;
 SELECT * INTO u FROM transporte.usuarios WHERE lower(email)=lower(trim(p_email)) FOR UPDATE;
 IF u.id IS NULL OR NOT u.activo OR u.email_verificado_at IS NOT NULL THEN RETURN; END IF;
 IF EXISTS(SELECT 1 FROM transporte.tokens_identidad WHERE usuario_id=u.id AND proposito='VERIFICAR_EMAIL' AND created_at>now()-interval '60 seconds') THEN RETURN; END IF;
 IF (SELECT count(*) FROM transporte.tokens_identidad WHERE usuario_id=u.id AND proposito='VERIFICAR_EMAIL' AND created_at>now()-interval '1 hour')>=5 THEN RETURN; END IF;
 INSERT INTO transporte.tokens_identidad(usuario_id,proposito,token_hash,expires_at)
 VALUES(u.id,'VERIFICAR_EMAIL',p_hash,now()+interval '60 minutes');
 RETURN QUERY SELECT u.email::text,u.nombres::text;
END $$;

CREATE OR REPLACE FUNCTION transporte.confirmar_activacion(p_hash text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,transporte AS $$
DECLARE t transporte.tokens_identidad; uid uuid; u transporte.usuarios;
BEGIN
 IF p_hash IS NULL OR p_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Enlace no valido' USING ERRCODE='PAV01'; END IF;
 SELECT usuario_id INTO uid FROM transporte.tokens_identidad WHERE token_hash=p_hash AND proposito='VERIFICAR_EMAIL';
 IF uid IS NULL THEN RAISE EXCEPTION 'Enlace no valido' USING ERRCODE='PAV01'; END IF;
 SELECT * INTO u FROM transporte.usuarios WHERE id=uid FOR UPDATE;
 SELECT * INTO t FROM transporte.tokens_identidad WHERE token_hash=p_hash AND proposito='VERIFICAR_EMAIL' FOR UPDATE;
 IF u.id IS NULL OR NOT u.activo OR t.consumido_at IS NOT NULL OR t.expires_at<=now() OR u.email_verificado_at IS NOT NULL THEN
   RAISE EXCEPTION 'Enlace vencido o usado' USING ERRCODE='PAV01';
 END IF;
 UPDATE transporte.usuarios SET email_verificado_at=now() WHERE id=uid;
 UPDATE transporte.tokens_identidad SET consumido_at=now() WHERE usuario_id=uid AND proposito='VERIFICAR_EMAIL' AND consumido_at IS NULL;
 INSERT INTO transporte.notificaciones(usuario_id,tipo,canal,evento_clave,payload)
 VALUES(uid,'BIENVENIDA_VERIFICADA','EMAIL','bienvenida-verificada:'||uid,'{}'::jsonb)
 ON CONFLICT(evento_clave,canal) DO NOTHING;
 RETURN uid;
END $$;

CREATE OR REPLACE FUNCTION transporte.emitir_sesion_autenticada(p_usuario uuid,p_token_hash text,p_expires timestamptz) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,transporte AS $$
DECLARE sid uuid;
BEGIN
 IF NOT transporte.email_activado(p_usuario) THEN RAISE EXCEPTION 'Activa tu cuenta antes de iniciar sesion' USING ERRCODE='PAV02'; END IF;
 IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' OR p_expires IS NULL OR p_expires<=now() OR p_expires>now()+interval '30 days' THEN RAISE EXCEPTION 'Sesion invalida'; END IF;
 INSERT INTO transporte.sesiones(usuario_id,token_hash,expires_at) VALUES(p_usuario,p_token_hash,p_expires) RETURNING id INTO sid;
 RETURN sid;
END $$;

CREATE OR REPLACE FUNCTION transporte.abrir_contexto(p_token_hash text,p_request_id text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,transporte AS $$
DECLARE uid uuid;
BEGIN
 SELECT u.id INTO uid FROM transporte.sesiones s JOIN transporte.usuarios u ON u.id=s.usuario_id
 WHERE s.token_hash=p_token_hash AND s.expires_at>now() AND s.revocada_at IS NULL AND u.activo AND u.email_verificado_at IS NOT NULL;
 IF uid IS NULL THEN RAISE EXCEPTION 'Sesion ausente, no activada, revocada o vencida' USING ERRCODE='28000'; END IF;
 PERFORM set_config('app.usuario_id',uid::text,true); PERFORM set_config('app.request_id',coalesce(p_request_id,''),true); RETURN uid;
END $$;

-- Cola específica de bienvenida: no consume notificaciones de otros módulos.
CREATE OR REPLACE FUNCTION transporte.reclamar_bienvenida(p_usuario uuid DEFAULT NULL)
RETURNS TABLE(notificacion_id uuid,destinatario text,nombre text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,transporte AS $$
DECLARE n transporte.notificaciones;
BEGIN
 SELECT * INTO n FROM transporte.notificaciones
 WHERE tipo='BIENVENIDA_VERIFICADA' AND canal='EMAIL' AND (p_usuario IS NULL OR usuario_id=p_usuario)
 AND (estado='PENDIENTE' OR (estado='FALLIDA' AND error_codigo='REINTENTABLE' AND created_at>now()-interval '10 minutes'))
 AND intentos<3 AND disponible_at<=now()
 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1;
 IF n.id IS NULL THEN RETURN; END IF;
 UPDATE transporte.notificaciones SET estado='EN_PROCESO',intentos=intentos+1 WHERE id=n.id;
 RETURN QUERY SELECT n.id,u.email::text,u.nombres::text FROM transporte.usuarios u WHERE u.id=n.usuario_id AND u.activo AND u.email_verificado_at IS NOT NULL;
END $$;

CREATE OR REPLACE FUNCTION transporte.finalizar_bienvenida(p_id uuid,p_aceptado boolean,p_ref text,p_error text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,transporte AS $$
BEGIN
 UPDATE transporte.notificaciones SET estado=CASE WHEN p_aceptado THEN 'ENVIADA' ELSE 'FALLIDA' END,
 proveedor_ref=left(p_ref,500),error_codigo=CASE WHEN p_aceptado THEN NULL ELSE left(p_error,80) END,
 disponible_at=now()+interval '60 seconds'
 WHERE id=p_id AND tipo='BIENVENIDA_VERIFICADA' AND canal='EMAIL' AND estado='EN_PROCESO';
END $$;

REVOKE ALL ON FUNCTION transporte.email_activado(uuid),transporte.solicitar_activacion(text,text),transporte.confirmar_activacion(text),transporte.reclamar_bienvenida(uuid),transporte.finalizar_bienvenida(uuid,boolean,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.email_activado(uuid),transporte.solicitar_activacion(text,text),transporte.confirmar_activacion(text),transporte.reclamar_bienvenida(uuid),transporte.finalizar_bienvenida(uuid,boolean,text,text) TO transporte_runtime;
