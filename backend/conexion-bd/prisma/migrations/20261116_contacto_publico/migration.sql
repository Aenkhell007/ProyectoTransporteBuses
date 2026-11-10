BEGIN;
-- Autorización del usuario: publicar solo los canales comerciales de Gran Continental.
INSERT INTO transporte.config_global(clave,valor)
SELECT 'cooperativa_publica_id',to_jsonb(id::text) FROM transporte.cooperativas
WHERE lower(nombre)='gran continental' ORDER BY created_at,id LIMIT 1
ON CONFLICT(clave) DO NOTHING;
CREATE FUNCTION transporte.contacto_publico() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT jsonb_build_object('nombre',c.nombre,'email',k.soporte_email,'telefono',k.telefono,
   'whatsapp',k.whatsapp,'direccion',k.direccion)
 FROM transporte.config_global cfg JOIN transporte.cooperativas c ON c.id::text=(cfg.valor #>> '{}')
 LEFT JOIN transporte.config_cooperativa k ON k.cooperativa_id=c.id
 WHERE cfg.clave='cooperativa_publica_id' AND c.activa LIMIT 1
$$;
REVOKE ALL ON FUNCTION transporte.contacto_publico() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.contacto_publico() TO transporte_runtime;
COMMIT;
