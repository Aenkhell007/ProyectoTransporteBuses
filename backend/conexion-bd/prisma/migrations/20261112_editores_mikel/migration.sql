BEGIN;
-- Ampliación aditiva: no sustituye el esquema existente ni borra datos.
ALTER TABLE transporte.buses ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version > 0);
CREATE FUNCTION transporte.version_bus_editor() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog AS $$
BEGIN
  NEW.version := OLD.version + 1;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION transporte.version_bus_editor() FROM PUBLIC;
CREATE TRIGGER version_editor BEFORE UPDATE ON transporte.buses
FOR EACH ROW EXECUTE FUNCTION transporte.version_bus_editor();
GRANT INSERT ON transporte.archivos TO transporte_runtime;
CREATE POLICY insertar_imagen_flota ON transporte.archivos FOR INSERT TO transporte_runtime
WITH CHECK(propietario_id=transporte.actor() AND
 ((categoria='LOGO' AND transporte.puede('config.admin',cooperativa_id)) OR
 (categoria='FOTO_BUS' AND transporte.puede('flota.admin',cooperativa_id))));
CREATE POLICY leer_imagen_flota ON transporte.archivos FOR SELECT TO transporte_runtime
USING(categoria IN('LOGO','FOTO_BUS') AND transporte.puede('cooperativa.leer',cooperativa_id));

-- Imágenes pequeñas normalizadas por el servidor. Metadatos y contenido se
-- confirman juntos; no quedan referencias a archivos locales de otro equipo.
CREATE TABLE transporte.flota_imagen_contenidos (
  archivo_id uuid PRIMARY KEY REFERENCES transporte.archivos(id),
  contenido bytea NOT NULL CHECK(octet_length(contenido) BETWEEN 1 AND 5242880)
);
ALTER TABLE transporte.flota_imagen_contenidos ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON transporte.flota_imagen_contenidos TO transporte_runtime;
CREATE POLICY leer ON transporte.flota_imagen_contenidos FOR SELECT TO transporte_runtime
USING(EXISTS(SELECT 1 FROM transporte.archivos a WHERE a.id=archivo_id AND transporte.puede('cooperativa.leer',a.cooperativa_id)));
CREATE POLICY insertar ON transporte.flota_imagen_contenidos FOR INSERT TO transporte_runtime
WITH CHECK(EXISTS(SELECT 1 FROM transporte.archivos a WHERE a.id=archivo_id AND a.propietario_id=transporte.actor()
AND ((a.categoria='LOGO' AND transporte.puede('config.admin',a.cooperativa_id)) OR (a.categoria='FOTO_BUS' AND transporte.puede('flota.admin',a.cooperativa_id)))));

INSERT INTO transporte.config_global(clave,valor) VALUES ('editor_sistema',
'{"idioma":"es-EC","moneda":"USD","zonaHoraria":"America/Guayaquil","sesionHoras":8,"mfaAdministradores":false,"formatos":["JPG","PNG","PDF"],"maxArchivoMB":5,"correo":false,"whatsapp":false}')
ON CONFLICT(clave) DO NOTHING;

-- Solo límites públicos: nunca devuelve claves, credenciales o filas arbitrarias.
CREATE FUNCTION transporte.limites_editor() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog AS $$
 SELECT jsonb_build_object('sesionHoras',valor->'sesionHoras','formatos',valor->'formatos','maxArchivoMB',valor->'maxArchivoMB')
 FROM transporte.config_global WHERE clave='editor_sistema'
$$;
REVOKE ALL ON FUNCTION transporte.limites_editor() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.limites_editor() TO transporte_runtime;

COMMIT;
