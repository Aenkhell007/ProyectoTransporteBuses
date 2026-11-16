BEGIN;
ALTER TABLE transporte.usuarios ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0);
ALTER TABLE transporte.membresias ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0);
CREATE TABLE transporte.usuario_permisos (
 membresia_id uuid NOT NULL REFERENCES transporte.membresias(id),
 permiso_id uuid NOT NULL REFERENCES transporte.permisos(id),
 habilitado boolean NOT NULL, PRIMARY KEY(membresia_id,permiso_id)
);
ALTER TABLE transporte.usuario_permisos ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON transporte.usuario_permisos TO transporte_runtime;
CREATE POLICY gestionar ON transporte.usuario_permisos FOR ALL TO transporte_runtime
 USING(transporte.puede('identidad.admin')) WITH CHECK(transporte.puede('identidad.admin'));
CREATE OR REPLACE FUNCTION transporte.puede(p_permiso text,p_coop uuid DEFAULT NULL,p_oficina uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM transporte.usuarios u WHERE u.id=transporte.actor() AND u.activo) AND (
 EXISTS(SELECT 1 FROM transporte.usuario_roles_globales ur JOIN transporte.roles r ON r.id=ur.rol_id JOIN transporte.rol_permiso rp ON rp.rol_id=r.id JOIN transporte.permisos p ON p.id=rp.permiso_id WHERE ur.usuario_id=transporte.actor() AND r.ambito='GLOBAL' AND p.codigo=p_permiso)
 OR(p_coop IS NOT NULL AND EXISTS(SELECT 1 FROM transporte.membresias m JOIN transporte.permisos p ON p.codigo=p_permiso
 WHERE m.usuario_id=transporte.actor() AND m.activa AND m.cooperativa_id=p_coop AND(p_oficina IS NULL OR m.oficina_id IS NULL OR m.oficina_id=p_oficina)
 AND coalesce((SELECT up.habilitado FROM transporte.usuario_permisos up WHERE up.membresia_id=m.id AND up.permiso_id=p.id),
 EXISTS(SELECT 1 FROM transporte.rol_permiso rp WHERE rp.rol_id=m.rol_id AND rp.permiso_id=p.id))))) $$;
CREATE FUNCTION transporte.identidad_guardar_perfil(p_version integer,p_datos jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF transporte.actor() IS NULL THEN RAISE EXCEPTION 'Sesion requerida' USING ERRCODE='28000'; END IF;
 UPDATE transporte.usuarios SET nombres=p_datos->>'nombres',apellidos=p_datos->>'apellidos',telefono=nullif(p_datos->>'telefono',''),nacimiento=nullif(p_datos->>'nacimiento','')::date,version=version+1,updated_at=now()
 WHERE id=transporte.actor() AND activo AND version=p_version;
 IF NOT FOUND THEN RAISE EXCEPTION 'Version obsoleta' USING ERRCODE='40001'; END IF;
END $$;
CREATE FUNCTION transporte.identidad_clave_actor() RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF transporte.actor() IS NULL THEN RAISE EXCEPTION 'Sesion requerida' USING ERRCODE='28000'; END IF;
 RETURN(SELECT password_hash FROM transporte.credenciales WHERE usuario_id=transporte.actor());
END $$;
CREATE FUNCTION transporte.identidad_cambiar_clave(p_anterior text,p_nueva text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF length(p_nueva)<30 THEN RAISE EXCEPTION 'Hash invalido'; END IF;
 UPDATE transporte.credenciales SET password_hash=p_nueva,password_updated_at=now(),updated_at=now() WHERE usuario_id=transporte.actor() AND password_hash=p_anterior;
 IF NOT FOUND THEN RAISE EXCEPTION 'Credencial cambio' USING ERRCODE='40001'; END IF;
 UPDATE transporte.sesiones SET revocada_at=now() WHERE usuario_id=transporte.actor() AND revocada_at IS NULL;
END $$;
CREATE FUNCTION transporte.identidad_guardar_usuario(p_id uuid,p_version integer,p_datos jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE uid uuid; rid uuid; cid uuid; oid uuid; anterior transporte.usuarios;
BEGIN
 PERFORM transporte.exigir('identidad.admin');
 PERFORM 1 FROM transporte.roles WHERE codigo='ADMIN_SISTEMA' FOR UPDATE;
 IF p_id IS NULL THEN
 INSERT INTO transporte.usuarios(nombres,apellidos,tipo_documento,documento,email,telefono) VALUES(p_datos->>'nombres',p_datos->>'apellidos',p_datos->>'tipoDocumento',p_datos->>'documento',lower(p_datos->>'email'),p_datos->>'telefono') RETURNING id INTO uid;
 ELSE
 SELECT * INTO anterior FROM transporte.usuarios WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Usuario no disponible' USING ERRCODE='P0002'; END IF;
 IF anterior.version<>p_version THEN RAISE EXCEPTION 'Version obsoleta' USING ERRCODE='40001'; END IF;
 uid:=p_id;
 IF NOT(p_datos->>'activo')::boolean THEN PERFORM transporte.cambiar_estado_usuario(uid,false); END IF;
 UPDATE transporte.usuarios SET nombres=p_datos->>'nombres',apellidos=p_datos->>'apellidos',telefono=p_datos->>'telefono',activo=(p_datos->>'activo')::boolean,version=version+1,updated_at=now() WHERE id=uid;
 END IF;
 IF p_datos ? 'rol' THEN
 SELECT id INTO rid FROM transporte.roles WHERE codigo=p_datos->>'rol';
 IF rid IS NULL THEN RAISE EXCEPTION 'Rol invalido'; END IF;
 IF p_datos->>'rol'='ADMIN_SISTEMA' THEN
 INSERT INTO transporte.usuario_roles_globales(usuario_id,rol_id) VALUES(uid,rid) ON CONFLICT DO NOTHING;
 ELSIF p_datos->>'rol'<>'CLIENTE' THEN
 cid:=nullif(p_datos->>'cooperativaId','')::uuid;oid:=nullif(p_datos->>'oficinaId','')::uuid;
 IF NOT EXISTS(SELECT 1 FROM transporte.cooperativas WHERE id=cid AND activa) THEN RAISE EXCEPTION 'Cooperativa invalida'; END IF;
 IF oid IS NOT NULL AND NOT EXISTS(SELECT 1 FROM transporte.oficinas WHERE id=oid AND cooperativa_id=cid AND activa) THEN RAISE EXCEPTION 'Oficina ajena'; END IF;
 INSERT INTO transporte.membresias(cooperativa_id,usuario_id,oficina_id,rol_id) VALUES(cid,uid,oid,rid) ON CONFLICT DO NOTHING;
 END IF;
 END IF;
 RETURN uid;
END $$;
CREATE FUNCTION transporte.identidad_guardar_permisos(p_id uuid,p_version integer,p_datos jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE m transporte.membresias; v record;
BEGIN
 PERFORM transporte.exigir('identidad.admin'); SELECT * INTO m FROM transporte.membresias WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Membresia no disponible' USING ERRCODE='P0002'; END IF;
 IF m.version<>p_version THEN RAISE EXCEPTION 'Version obsoleta' USING ERRCODE='40001'; END IF;
 FOR v IN SELECT * FROM jsonb_each(p_datos) LOOP
 IF v.key NOT IN('oficina.vender','cooperativa.leer','pagos.revisar','operacion.admin') OR jsonb_typeof(v.value)<>'boolean' THEN RAISE EXCEPTION 'Permiso no delegable'; END IF;
 INSERT INTO transporte.usuario_permisos(membresia_id,permiso_id,habilitado) SELECT m.id,id,v.value::text::boolean FROM transporte.permisos WHERE codigo=v.key
 ON CONFLICT(membresia_id,permiso_id) DO UPDATE SET habilitado=excluded.habilitado;
 END LOOP;
 UPDATE transporte.membresias SET version=version+1,updated_at=now() WHERE id=m.id;
 UPDATE transporte.sesiones SET revocada_at=now() WHERE usuario_id=m.usuario_id AND revocada_at IS NULL;
END $$;
CREATE FUNCTION transporte.identidad_preparar_invitacion(p_usuario uuid,p_hash text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE email text;
BEGIN
 PERFORM transporte.exigir('identidad.admin');
 SELECT u.email INTO email FROM transporte.usuarios u WHERE u.id=p_usuario AND activo;
 IF email IS NULL THEN RAISE EXCEPTION 'Usuario inactivo'; END IF;
 IF EXISTS(SELECT 1 FROM transporte.tokens_identidad WHERE usuario_id=p_usuario AND proposito='INVITACION' AND created_at>now()-interval '1 minute') THEN RAISE EXCEPTION 'Espera un minuto antes de reenviar'; END IF;
 UPDATE transporte.tokens_identidad SET consumido_at=now() WHERE usuario_id=p_usuario AND proposito='INVITACION' AND consumido_at IS NULL;
 INSERT INTO transporte.tokens_identidad(usuario_id,proposito,token_hash,expires_at) VALUES(p_usuario,'INVITACION',p_hash,now()+interval '1 hour');
 RETURN email;
END $$;
CREATE FUNCTION transporte.identidad_aceptar_invitacion(p_hash text,p_clave text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE t transporte.tokens_identidad;
BEGIN
 SELECT * INTO t FROM transporte.tokens_identidad WHERE token_hash=p_hash AND proposito='INVITACION' AND consumido_at IS NULL AND expires_at>now() FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM transporte.usuarios WHERE id=t.usuario_id AND activo) OR length(p_clave)<30 THEN RAISE EXCEPTION 'Invitacion invalida'; END IF;
 INSERT INTO transporte.credenciales(usuario_id,password_hash) VALUES(t.usuario_id,p_clave) ON CONFLICT(usuario_id) DO UPDATE SET password_hash=excluded.password_hash,password_updated_at=now();
 UPDATE transporte.usuarios SET email_verificado_at=coalesce(email_verificado_at,now()),version=version+1 WHERE id=t.usuario_id;
 UPDATE transporte.tokens_identidad SET consumido_at=now() WHERE id=t.id;
 UPDATE transporte.sesiones SET revocada_at=now() WHERE usuario_id=t.usuario_id AND revocada_at IS NULL;
END $$;
REVOKE ALL ON FUNCTION transporte.identidad_guardar_perfil(integer,jsonb),transporte.identidad_clave_actor(),transporte.identidad_cambiar_clave(text,text),transporte.identidad_guardar_usuario(uuid,integer,jsonb),transporte.identidad_guardar_permisos(uuid,integer,jsonb),transporte.identidad_preparar_invitacion(uuid,text),transporte.identidad_aceptar_invitacion(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.identidad_guardar_perfil(integer,jsonb),transporte.identidad_clave_actor(),transporte.identidad_cambiar_clave(text,text),transporte.identidad_guardar_usuario(uuid,integer,jsonb),transporte.identidad_guardar_permisos(uuid,integer,jsonb),transporte.identidad_preparar_invitacion(uuid,text) TO transporte_runtime;
GRANT EXECUTE ON FUNCTION transporte.identidad_aceptar_invitacion(text,text) TO transporte_runtime;

CREATE FUNCTION transporte.identidad_asignar_rol(p_usuario uuid,p_version integer,p_datos jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE rid uuid; cid uuid; oid uuid; mid uuid; actual integer;
BEGIN
 PERFORM transporte.exigir('identidad.admin');
 PERFORM 1 FROM transporte.roles WHERE codigo='ADMIN_SISTEMA' FOR UPDATE;
 SELECT version INTO actual FROM transporte.usuarios WHERE id=p_usuario FOR UPDATE;
 IF actual IS DISTINCT FROM p_version THEN RAISE EXCEPTION 'Version obsoleta' USING ERRCODE='40001'; END IF;
 SELECT id INTO rid FROM transporte.roles WHERE codigo=p_datos->>'rol';
 IF rid IS NULL THEN RAISE EXCEPTION 'Rol invalido'; END IF;
 IF p_datos->>'rol'<>'ADMIN_SISTEMA' AND EXISTS(SELECT 1 FROM transporte.usuario_roles_globales g JOIN transporte.roles r ON r.id=g.rol_id WHERE g.usuario_id=p_usuario AND r.codigo='ADMIN_SISTEMA') THEN
  IF(SELECT count(DISTINCT g.usuario_id) FROM transporte.usuario_roles_globales g JOIN transporte.roles r ON r.id=g.rol_id JOIN transporte.usuarios u ON u.id=g.usuario_id WHERE r.codigo='ADMIN_SISTEMA' AND u.activo)<=1 THEN RAISE EXCEPTION 'No puede retirar al ultimo administrador'; END IF;
  DELETE FROM transporte.usuario_roles_globales g USING transporte.roles r WHERE g.rol_id=r.id AND r.codigo='ADMIN_SISTEMA' AND g.usuario_id=p_usuario;
 END IF;
 IF p_datos->>'rol'='ADMIN_SISTEMA' THEN
  INSERT INTO transporte.usuario_roles_globales(usuario_id,rol_id) VALUES(p_usuario,rid) ON CONFLICT DO NOTHING;
 ELSIF p_datos->>'rol'='CLIENTE' THEN
  UPDATE transporte.membresias SET activa=false,version=version+1 WHERE usuario_id=p_usuario AND activa;
 ELSE
  cid:=nullif(p_datos->>'cooperativaId','')::uuid;oid:=nullif(p_datos->>'oficinaId','')::uuid;mid:=nullif(p_datos->>'membresiaId','')::uuid;
  IF NOT EXISTS(SELECT 1 FROM transporte.cooperativas WHERE id=cid AND activa) THEN RAISE EXCEPTION 'Cooperativa no disponible'; END IF;
  IF oid IS NOT NULL AND NOT EXISTS(SELECT 1 FROM transporte.oficinas WHERE id=oid AND cooperativa_id=cid AND activa) THEN RAISE EXCEPTION 'Oficina de otra cooperativa'; END IF;
  IF mid IS NOT NULL THEN
   IF NOT EXISTS(SELECT 1 FROM transporte.membresias WHERE id=mid AND usuario_id=p_usuario) THEN RAISE EXCEPTION 'Membresia de otro usuario'; END IF;
   DELETE FROM transporte.usuario_permisos WHERE membresia_id=mid;
   UPDATE transporte.membresias SET rol_id=rid,cooperativa_id=cid,oficina_id=oid,activa=true,version=version+1 WHERE id=mid;
  ELSE INSERT INTO transporte.membresias(usuario_id,cooperativa_id,oficina_id,rol_id) VALUES(p_usuario,cid,oid,rid) ON CONFLICT DO NOTHING;
  END IF;
 END IF;
 UPDATE transporte.usuarios SET version=version+1,updated_at=now() WHERE id=p_usuario;
 UPDATE transporte.sesiones SET revocada_at=now() WHERE usuario_id=p_usuario AND revocada_at IS NULL;
END $$;
REVOKE ALL ON FUNCTION transporte.identidad_asignar_rol(uuid,integer,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.identidad_asignar_rol(uuid,integer,jsonb) TO transporte_runtime;

COMMIT;
