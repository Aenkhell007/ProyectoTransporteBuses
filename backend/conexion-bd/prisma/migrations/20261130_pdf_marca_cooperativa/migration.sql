BEGIN;

CREATE FUNCTION transporte.marca_boleto_reserva(p_reserva uuid)
RETURNS TABLE(color_primario text, color_secundario text, logo bytea)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  reserva transporte.reservas;
BEGIN
  reserva := transporte.reserva_autorizada(p_reserva);
  RETURN QUERY
  SELECT cfg.color_primario::text, cfg.color_secundario::text, imagen.contenido
  FROM transporte.config_cooperativa cfg
  LEFT JOIN transporte.archivos archivo
    ON archivo.id = cfg.logo_archivo_id AND archivo.cooperativa_id = reserva.cooperativa_id
  LEFT JOIN transporte.flota_imagen_contenidos imagen
    ON imagen.archivo_id = archivo.id AND octet_length(imagen.contenido) <= 2097152
  WHERE cfg.cooperativa_id = reserva.cooperativa_id;
END;
$$;

REVOKE ALL ON FUNCTION transporte.marca_boleto_reserva(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.marca_boleto_reserva(uuid) TO transporte_runtime;

COMMIT;
