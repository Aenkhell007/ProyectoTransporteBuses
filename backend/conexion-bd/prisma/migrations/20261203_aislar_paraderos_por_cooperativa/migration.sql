BEGIN;

CREATE OR REPLACE FUNCTION transporte.registrar_paradero_local(
  p_cooperativa_id uuid,
  p_ciudad_id uuid,
  p_nombre text,
  p_tipo_punto text,
  p_sector text DEFAULT NULL,
  p_direccion text DEFAULT NULL,
  p_referencia text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = transporte, pg_catalog
AS $$
DECLARE
  v_ambito text;
  v_coop_prov text;
  v_ciudad_prov text;
  v_nombre text;
  v_tipo text;
  v_sector text;
  v_direccion text;
  v_referencia text;
  v_id uuid;
BEGIN
  PERFORM transporte.exigir('operacion.admin', p_cooperativa_id);

  SELECT ambito_operacion, provincia
  INTO v_ambito, v_coop_prov
  FROM transporte.cooperativas
  WHERE id = p_cooperativa_id
    AND activa;

  IF v_ambito IS NULL THEN
    RAISE EXCEPTION 'Cooperativa no disponible' USING ERRCODE = '42501';
  END IF;

  SELECT provincia
  INTO v_ciudad_prov
  FROM transporte.ciudades
  WHERE id = p_ciudad_id
    AND activa;

  IF v_ciudad_prov IS NULL THEN
    RAISE EXCEPTION 'Cantón no disponible' USING ERRCODE = '23514';
  END IF;

  IF v_ambito NOT IN ('URBANA', 'RURAL') THEN
    RAISE EXCEPTION 'Solo las cooperativas locales pueden registrar paraderos'
      USING ERRCODE = '42501';
  END IF;

  IF lower(trim(v_ciudad_prov)) <> lower(trim(coalesce(v_coop_prov, ''))) THEN
    RAISE EXCEPTION 'El punto de referencia debe pertenecer a la provincia asignada a la cooperativa'
      USING ERRCODE = '23514';
  END IF;

  v_nombre := trim(coalesce(p_nombre, ''));
  v_tipo := upper(trim(coalesce(nullif(p_tipo_punto, ''), 'PARADERO')));
  v_sector := nullif(trim(coalesce(p_sector, '')), '');
  v_direccion := nullif(trim(coalesce(p_direccion, '')), '');
  v_referencia := nullif(trim(coalesce(p_referencia, '')), '');

  IF v_tipo NOT IN ('TERMINAL', 'PARADERO', 'BARRIO', 'PARROQUIA', 'MERCADO', 'SECTOR', 'REFERENCIA')
     OR length(v_nombre) NOT BETWEEN 2 AND 150 THEN
    RAISE EXCEPTION 'Nombre o tipo de punto de referencia inválido' USING ERRCODE = '23514';
  END IF;

  INSERT INTO transporte.terminales (
    ciudad_id, nombre, direccion, tipo_punto, sector, referencia, cooperativa_id, activa
  )
  VALUES (
    p_ciudad_id, v_nombre, v_direccion, v_tipo, v_sector, v_referencia, p_cooperativa_id, true
  )
  ON CONFLICT (ciudad_id, nombre) DO UPDATE SET
    direccion = coalesce(EXCLUDED.direccion, terminales.direccion),
    sector = coalesce(EXCLUDED.sector, terminales.sector),
    referencia = coalesce(EXCLUDED.referencia, terminales.referencia),
    tipo_punto = EXCLUDED.tipo_punto,
    activa = true,
    updated_at = now()
  WHERE terminales.cooperativa_id = p_cooperativa_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'El nombre está reservado por otro punto del cantón'
      USING ERRCODE = '23505';
  END IF;

  RETURN v_id;
END $$;

COMMIT;
