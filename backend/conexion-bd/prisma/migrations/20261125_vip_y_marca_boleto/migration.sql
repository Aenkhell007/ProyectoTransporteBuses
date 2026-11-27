BEGIN;

-- Funciones SECURITY DEFINER idempotentes para lectura RLS-safe de tarifas por clase,
-- desglose VIP y marca/logo de la cooperativa en compras y boletos.

CREATE OR REPLACE FUNCTION transporte.compra_tarifas_viaje(
  p_viaje uuid,
  p_origen integer,
  p_destino integer
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = transporte, pg_catalog
AS $$
  SELECT coalesce(jsonb_object_agg(codigo, precio), '{}'::jsonb)
  FROM (
    SELECT cl.codigo, min(t.precio_centavos)::int AS precio
    FROM transporte.viajes v
    JOIN transporte.frecuencias f ON f.id = v.frecuencia_id
    JOIN transporte.buses b ON b.id = v.bus_id
    JOIN transporte.cooperativas co ON co.id = v.cooperativa_id
    JOIN transporte.tarifas t ON t.frecuencia_id = f.id
      AND t.grupo_id = b.grupo_id
      AND t.origen_orden = p_origen
      AND t.destino_orden = p_destino
      AND t.activa
      AND t.vigencia @> (v.salida AT TIME ZONE 'America/Guayaquil')::date
    JOIN transporte.clases_asiento cl ON cl.id = t.clase_id
    WHERE v.id = p_viaje
      AND v.estado = 'PUBLICADO'
      AND v.salida > now()
      AND f.activa
      AND b.activo
      AND co.activa
    GROUP BY cl.codigo
  ) x;
$$;

CREATE OR REPLACE FUNCTION transporte.reserva_detalle_vip_marca(
  p_reserva uuid
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = transporte, pg_catalog
AS $$
DECLARE
  r transporte.reservas;
  tarifa_normal integer;
  asientos_json jsonb;
  marca_json jsonb;
BEGIN
  r := transporte.reserva_autorizada(p_reserva);

  SELECT t.precio_centavos::int
  INTO tarifa_normal
  FROM transporte.viajes v
  JOIN transporte.buses b ON b.id = v.bus_id
  JOIN transporte.tarifas t ON t.frecuencia_id = v.frecuencia_id
    AND t.grupo_id = b.grupo_id
    AND t.origen_orden = r.origen_orden
    AND t.destino_orden = r.destino_orden
  JOIN transporte.clases_asiento cl ON cl.id = t.clase_id AND cl.codigo = 'NORMAL'
  WHERE v.id = r.viaje_id
  ORDER BY
    (t.activa AND t.vigencia @> (v.salida AT TIME ZONE 'America/Guayaquil')::date) DESC,
    (t.vigencia @> (v.salida AT TIME ZONE 'America/Guayaquil')::date) DESC,
    t.activa DESC,
    t.created_at DESC
  LIMIT 1;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'asiento', pc.codigo,
        'piso', pc.piso,
        'clase', cl.codigo
      )
      ORDER BY pc.piso, pc.fila, pc.columna
    ),
    '[]'::jsonb
  )
  INTO asientos_json
  FROM transporte.reserva_asientos a
  JOIN transporte.plano_celdas pc ON pc.id = a.asiento_id
  JOIN transporte.clases_asiento cl ON cl.id = pc.clase_id
  WHERE a.reserva_id = r.id;

  SELECT jsonb_build_object(
    'cooperativa', c.nombre,
    'colorPrimario', coalesce(k.color_primario, '#CB102E'),
    'colorSecundario', coalesce(k.color_secundario, '#00833E'),
    'colorTexto', coalesce(k.color_texto, '#1A2A33'),
    'tieneLogo', (k.logo_archivo_id IS NOT NULL)
  )
  INTO marca_json
  FROM transporte.cooperativas c
  LEFT JOIN transporte.config_cooperativa k ON k.cooperativa_id = c.id
  WHERE c.id = r.cooperativa_id;

  RETURN jsonb_build_object(
    'tarifaNormalCentavos', tarifa_normal,
    'asientos', asientos_json,
    'marca', coalesce(
      marca_json,
      jsonb_build_object(
        'cooperativa', '',
        'colorPrimario', '#CB102E',
        'colorSecundario', '#00833E',
        'colorTexto', '#1A2A33',
        'tieneLogo', false
      )
    )
  );
END $$;

CREATE OR REPLACE FUNCTION transporte.logo_cooperativa_reserva(
  p_reserva uuid
) RETURNS bytea
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = transporte, pg_catalog
AS $$
DECLARE
  r transporte.reservas;
  contenido_logo bytea;
BEGIN
  r := transporte.reserva_autorizada(p_reserva);

  SELECT fi.contenido
  INTO contenido_logo
  FROM transporte.config_cooperativa k
  JOIN transporte.flota_imagen_contenidos fi ON fi.archivo_id = k.logo_archivo_id
  WHERE k.cooperativa_id = r.cooperativa_id;

  RETURN contenido_logo;
END $$;

REVOKE ALL ON FUNCTION
  transporte.compra_tarifas_viaje(uuid, integer, integer),
  transporte.reserva_detalle_vip_marca(uuid),
  transporte.logo_cooperativa_reserva(uuid)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  transporte.compra_tarifas_viaje(uuid, integer, integer),
  transporte.reserva_detalle_vip_marca(uuid),
  transporte.logo_cooperativa_reserva(uuid)
TO transporte_runtime;

COMMIT;
