BEGIN;
-- config.admin puede cambiar solo la identidad de su ámbito. No concede
-- UPDATE general sobre cooperativas ni acceso a activa u otras columnas.
CREATE FUNCTION transporte.actualizar_identidad_cooperativa(
  p_id uuid, p_version integer, p_nombre text, p_razon text, p_ruc text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actual integer;
BEGIN
  PERFORM transporte.exigir('config.admin',p_id);
  SELECT version INTO actual FROM transporte.cooperativas WHERE id=p_id AND activa FOR UPDATE;
  IF actual IS NULL THEN RAISE EXCEPTION 'Cooperativa no disponible' USING ERRCODE='42501'; END IF;
  IF actual IS DISTINCT FROM p_version THEN RAISE EXCEPTION 'Identidad modificada' USING ERRCODE='40001'; END IF;
  IF p_nombre IS NULL OR length(trim(p_nombre)) NOT BETWEEN 1 AND 150
     OR p_razon IS NULL OR length(trim(p_razon)) NOT BETWEEN 1 AND 200
     OR p_ruc IS NULL OR p_ruc !~ '^[0-9]{13}$' THEN
    RAISE EXCEPTION 'Identidad inválida' USING ERRCODE='23514';
  END IF;
  UPDATE transporte.cooperativas SET nombre=trim(p_nombre),razon_social=trim(p_razon),ruc=p_ruc,
    version=version+1,updated_at=now() WHERE id=p_id;
END $$;
REVOKE ALL ON FUNCTION transporte.actualizar_identidad_cooperativa(uuid,integer,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.actualizar_identidad_cooperativa(uuid,integer,text,text,text) TO transporte_runtime;
COMMIT;
