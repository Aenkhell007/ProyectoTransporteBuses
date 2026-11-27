BEGIN;

-- 1. Clasificación territorial y ámbito de operación en cooperativas
ALTER TABLE transporte.cooperativas
  ADD COLUMN IF NOT EXISTS ambito_operacion varchar(20) NOT NULL DEFAULT 'INTERPROVINCIAL',
  ADD COLUMN IF NOT EXISTS provincia varchar(100);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'transporte.cooperativas'::regclass
      AND conname = 'cooperativas_ambito_operacion_chk'
  ) THEN
    ALTER TABLE transporte.cooperativas
      ADD CONSTRAINT cooperativas_ambito_operacion_chk
      CHECK (ambito_operacion IN ('INTERPROVINCIAL', 'URBANA', 'RURAL'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'transporte.cooperativas'::regclass
      AND conname = 'cooperativas_provincia_local_chk'
  ) THEN
    ALTER TABLE transporte.cooperativas
      ADD CONSTRAINT cooperativas_provincia_local_chk
      CHECK (
        ambito_operacion = 'INTERPROVINCIAL'
        OR (provincia IS NOT NULL AND length(trim(provincia)) > 0)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS cooperativas_ambito_provincia_idx
  ON transporte.cooperativas (ambito_operacion, provincia);

-- 2. Puntos de referencia locales (paraderos, barrios, parroquias, mercados, sectores)
ALTER TABLE transporte.terminales
  ADD COLUMN IF NOT EXISTS tipo_punto varchar(30) NOT NULL DEFAULT 'TERMINAL',
  ADD COLUMN IF NOT EXISTS sector varchar(150),
  ADD COLUMN IF NOT EXISTS referencia varchar(250),
  ADD COLUMN IF NOT EXISTS cooperativa_id uuid REFERENCES transporte.cooperativas(id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'transporte.terminales'::regclass
      AND conname = 'terminales_tipo_punto_chk'
  ) THEN
    ALTER TABLE transporte.terminales
      ADD CONSTRAINT terminales_tipo_punto_chk
      CHECK (tipo_punto IN ('TERMINAL', 'PARADERO', 'BARRIO', 'PARROQUIA', 'MERCADO', 'SECTOR', 'REFERENCIA'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS terminales_ciudad_tipo_idx
  ON transporte.terminales (ciudad_id, tipo_punto);

CREATE INDEX IF NOT EXISTS terminales_cooperativa_idx
  ON transporte.terminales (cooperativa_id);

-- 3. Alta transaccional de cooperativa con ámbito de operación y provincia
CREATE OR REPLACE FUNCTION transporte.alta_cooperativa_responsable(
  p_coop jsonb,
  p_persona jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = transporte, pg_catalog
AS $$
DECLARE
  cid uuid;
  uid uuid;
  v_ambito text;
  v_provincia text;
BEGIN
  PERFORM transporte.exigir('cooperativas.admin');
  PERFORM transporte.exigir('identidad.admin');

  v_ambito := coalesce(nullif(upper(trim(p_coop->>'ambitoOperacion')), ''), 'INTERPROVINCIAL');
  v_provincia := nullif(trim(p_coop->>'provincia'), '');

  INSERT INTO transporte.cooperativas (nombre, razon_social, ruc, ambito_operacion, provincia)
  VALUES (p_coop->>'nombre', p_coop->>'razonSocial', p_coop->>'ruc', v_ambito, v_provincia)
  RETURNING id INTO cid;

  SELECT id INTO uid
  FROM transporte.usuarios
  WHERE lower(email) = lower(trim(p_persona->>'email'));

  IF uid IS NULL THEN
    INSERT INTO transporte.usuarios (nombres, apellidos, tipo_documento, documento, email, telefono)
    VALUES (
      p_persona->>'nombres',
      p_persona->>'apellidos',
      p_persona->>'tipoDocumento',
      p_persona->>'documento',
      lower(trim(p_persona->>'email')),
      p_persona->>'telefono'
    )
    RETURNING id INTO uid;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM transporte.usuarios
    WHERE id = uid
      AND tipo_documento = p_persona->>'tipoDocumento'
      AND documento = p_persona->>'documento'
  ) THEN
    RAISE EXCEPTION 'Correo existente con otra identidad';
  END IF;

  INSERT INTO transporte.membresias (cooperativa_id, usuario_id, rol_id)
  SELECT cid, uid, id
  FROM transporte.roles
  WHERE codigo = 'COOPERATIVA';

  INSERT INTO transporte.config_cooperativa (cooperativa_id) VALUES (cid);
  INSERT INTO transporte.politica_comprobantes (cooperativa_id) VALUES (cid);
  INSERT INTO transporte.cooperativa_metodos_pago (cooperativa_id, metodo_id)
  SELECT cid, id FROM transporte.metodos_pago;

  RETURN cid;
END $$;

-- 4. Actualización segura de ámbito y provincia desde configuración de cooperativa
CREATE OR REPLACE FUNCTION transporte.actualizar_ambito_cooperativa(
  p_id uuid,
  p_ambito text,
  p_provincia text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = transporte, pg_catalog
AS $$
DECLARE
  v_ambito text;
  v_provincia text;
BEGIN
  PERFORM transporte.exigir('config.admin', p_id);

  v_ambito := upper(trim(coalesce(p_ambito, 'INTERPROVINCIAL')));
  v_provincia := nullif(trim(coalesce(p_provincia, '')), '');

  IF v_ambito NOT IN ('INTERPROVINCIAL', 'URBANA', 'RURAL')
     OR (v_ambito <> 'INTERPROVINCIAL' AND v_provincia IS NULL)
     OR (v_provincia IS NOT NULL AND length(v_provincia) > 100) THEN
    RAISE EXCEPTION 'Ámbito o provincia de operación inválidos' USING ERRCODE = '23514';
  END IF;

  UPDATE transporte.cooperativas
  SET ambito_operacion = v_ambito,
      provincia = v_provincia,
      updated_at = now()
  WHERE id = p_id
    AND activa;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cooperativa no disponible' USING ERRCODE = '42501';
  END IF;
END $$;

-- 5. Registro de paraderos locales y puntos de referencia restringido a la provincia de la cooperativa
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

  IF v_ambito IN ('URBANA', 'RURAL')
     AND lower(trim(v_ciudad_prov)) <> lower(trim(coalesce(v_coop_prov, ''))) THEN
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
    cooperativa_id = CASE
      WHEN terminales.cooperativa_id IS NULL THEN NULL
      WHEN terminales.cooperativa_id = p_cooperativa_id THEN p_cooperativa_id
      ELSE NULL
    END,
    activa = true,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION
  transporte.alta_cooperativa_responsable(jsonb, jsonb),
  transporte.actualizar_ambito_cooperativa(uuid, text, text),
  transporte.registrar_paradero_local(uuid, uuid, text, text, text, text, text)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  transporte.alta_cooperativa_responsable(jsonb, jsonb),
  transporte.actualizar_ambito_cooperativa(uuid, text, text),
  transporte.registrar_paradero_local(uuid, uuid, text, text, text, text, text)
TO transporte_runtime;

-- 6. Puntos de referencia locales conocidos en las 24 provincias del Ecuador
INSERT INTO transporte.terminales (ciudad_id, nombre, direccion, tipo_punto, sector, referencia)
SELECT c.id, v.nombre, v.direccion, v.tipo_punto, v.sector, NULL
FROM (
  VALUES
    -- Azuay
    ('Azuay', 'Cuenca', 'Mercado 9 de Octubre', 'MERCADO', 'Centro Histórico', 'Plaza Cívica y Mariscal Lamar'),
    ('Azuay', 'Cuenca', 'Paradero Feria Libre / El Arenal', 'PARADERO', 'El Arenal', 'Av. de las Américas y Cantón Saraguro'),
    ('Azuay', 'Cuenca', 'Parroquia Baños de Cuenca', 'PARROQUIA', 'Baños', 'Parque Central de Baños'),
    ('Azuay', 'Cuenca', 'Barrio Totoracocha', 'BARRIO', 'Totoracocha', 'Av. Hurtado de Mendoza y Guapondelig'),
    ('Azuay', 'Gualaceo', 'Mercado 25 de Junio', 'MERCADO', 'Centro de Gualaceo', 'Av. Jaime Roldós Aguilera'),
    -- Bolívar
    ('Bolívar', 'Guaranda', 'Mercado 10 de Noviembre', 'MERCADO', 'Centro de Guaranda', 'Calle Convención de 1884 y García Moreno'),
    ('Bolívar', 'Guaranda', 'Paradero Parque El Libertador', 'PARADERO', 'Centro', 'Parque Central de Guaranda'),
    ('Bolívar', 'Guaranda', 'Parroquia Salinas de Guaranda', 'PARROQUIA', 'Salinas', 'Plaza Central Comunitaria'),
    -- Cañar
    ('Cañar', 'Azogues', 'Mercado Sucre', 'MERCADO', 'Centro de Azogues', 'Calle Emilio Abad y Serrano'),
    ('Cañar', 'Azogues', 'Paradero Parque del Trabajo', 'PARADERO', 'Bayas / Centro', 'Av. 24 de Mayo'),
    ('Cañar', 'La Troncal', 'Paradero Redondel Manuel J. Calle', 'PARADERO', 'Manuel J. Calle', 'Vía a El Triunfo'),
    -- Carchi
    ('Carchi', 'Tulcán', 'Parque Central de Tulcán', 'REFERENCIA', 'Centro', 'Calle Sucre y 10 de Agosto'),
    ('Carchi', 'Tulcán', 'Paradero Cementerio José María Azael Franco', 'PARADERO', 'Norte', 'Av. del Cementerio'),
    ('Carchi', 'Tulcán', 'Mercado Cepeda', 'MERCADO', 'Centro Sur', 'Calle Olmedo y Junín'),
    -- Chimborazo
    ('Chimborazo', 'Riobamba', 'Mercado Mayorista de Riobamba (EP-EMMPA)', 'MERCADO', 'Sur de Riobamba', 'Av. Leopoldo Freire'),
    ('Chimborazo', 'Riobamba', 'Paradero La Condamine', 'PARADERO', 'La Condamine', 'Calle Carabobo y Colombia'),
    ('Chimborazo', 'Riobamba', 'Parroquia San Luis', 'PARROQUIA', 'San Luis', 'Parque Central de San Luis'),
    ('Chimborazo', 'Riobamba', 'Barrio Bellavista / ESPOCH', 'BARRIO', 'Bellavista', 'Panamericana Sur km 1 1/2'),
    ('Chimborazo', 'Guano', 'Paradero Parque Central de Guano', 'PARADERO', 'Centro', 'Frente al GAD Municipal'),
    ('Chimborazo', 'Alausí', 'Plaza Eloy Alfaro', 'REFERENCIA', 'Centro de Alausí', 'Estación del Ferrocarril'),
    -- Cotopaxi
    ('Cotopaxi', 'Latacunga', 'Mercado Mayorista El Salto', 'MERCADO', 'El Salto', 'Av. Amazonas y Antonia Vela'),
    ('Cotopaxi', 'Latacunga', 'Paradero San Felipe', 'PARADERO', 'San Felipe', 'Campus UTC San Felipe'),
    ('Cotopaxi', 'Latacunga', 'Parroquia Mulaló', 'PARROQUIA', 'Mulaló', 'Parque Central de Mulaló'),
    ('Cotopaxi', 'Salcedo', 'Paradero Parque 19 de Septiembre', 'PARADERO', 'Centro', 'Av. 24 de Mayo'),
    ('Cotopaxi', 'Pujilí', 'Mercado Rosalino Ruiz', 'MERCADO', 'Centro de Pujilí', 'Calle García Moreno'),
    -- El Oro
    ('El Oro', 'Machala', 'Paradero Parque Juan Montalvo', 'PARADERO', 'Centro', 'Av. 25 de Junio y Rocafuerte'),
    ('El Oro', 'Machala', 'Mercado Central de Machala', 'MERCADO', 'Centro', 'Calle Pasaje y Guayas'),
    ('El Oro', 'Pasaje', 'Paradero Parque Abdón Calderón', 'PARADERO', 'Centro de Pasaje', 'Av. Rocafuerte'),
    ('El Oro', 'Santa Rosa', 'Mercado Municipal de Santa Rosa', 'MERCADO', 'Centro', 'Calle Colón y Chávez'),
    -- Esmeraldas
    ('Esmeraldas', 'Esmeraldas', 'Paradero Las Palmas', 'PARADERO', 'Las Palmas', 'Malecón de Las Palmas'),
    ('Esmeraldas', 'Esmeraldas', 'Mercado Municipal Central', 'MERCADO', 'Centro', 'Calle Bolívar y Piedrahíta'),
    ('Esmeraldas', 'Atacames', 'Paradero Redondel de Atacames', 'PARADERO', 'Atacames Centro', 'Vía Súa / Tonsupa'),
    -- Galápagos
    ('Galápagos', 'Santa Cruz', 'Muelle de Puerto Ayora', 'REFERENCIA', 'Puerto Ayora', 'Av. Charles Darwin'),
    ('Galápagos', 'Santa Cruz', 'Parroquia Bellavista', 'PARROQUIA', 'Bellavista', 'Vía a Los Gemelos'),
    ('Galápagos', 'San Cristóbal', 'Paradero Parque Charles Darwin', 'PARADERO', 'Puerto Baquerizo Moreno', 'Malecón Charles Darwin'),
    -- Guayas
    ('Guayas', 'Guayaquil', 'Estación Río Daule / Terminal Metrovia', 'PARADERO', 'Tarqui / Norte', 'Av. Benjamín Rosales'),
    ('Guayas', 'Guayaquil', 'Mercado Central de Guayaquil', 'MERCADO', 'Centro', 'Calle Lorenzo de Garaycoa y 10 de Agosto'),
    ('Guayas', 'Guayaquil', 'Sector La Garzota / Mall del Sol', 'SECTOR', 'La Garzota', 'Av. Guillermo Pareja'),
    ('Guayas', 'Durán', 'Paradero El Recreo', 'PARADERO', 'El Recreo', 'Av. Nicolás Lapentti'),
    ('Guayas', 'Daule', 'Paradero Parque de los Mariscos / Centro', 'PARADERO', 'Centro', 'Calle Piedrahíta'),
    ('Guayas', 'Milagro', 'Mercado Central La Dolorosa', 'MERCADO', 'Centro de Milagro', 'Av. 17 de Septiembre'),
    -- Imbabura
    ('Imbabura', 'Ibarra', 'Mercado Amazonas', 'MERCADO', 'Centro Sur', 'Av. Eugenio Espejo y Sánchez y Cifuentes'),
    ('Imbabura', 'Ibarra', 'Paradero Parque La Merced', 'PARADERO', 'Centro', 'Calle Olmedo y García Moreno'),
    ('Imbabura', 'Ibarra', 'Parroquia San Antonio de Ibarra', 'PARROQUIA', 'San Antonio', 'Parque Central'),
    ('Imbabura', 'Otavalo', 'Plaza de los Ponchos / Mercado Centenario', 'MERCADO', 'Centro de Otavalo', 'Calle Sucre y Quiroga'),
    -- Loja
    ('Loja', 'Loja', 'Mercado Gran Colombia', 'MERCADO', 'Centro Norte', 'Av. Gran Colombia y José Antonio Eguiguren'),
    ('Loja', 'Loja', 'Paradero San Sebastián', 'PARADERO', 'San Sebastián', 'Plaza de la Independencia'),
    ('Loja', 'Loja', 'Parroquia Vilcabamba', 'PARROQUIA', 'Vilcabamba', 'Parque Central de Vilcabamba'),
    ('Loja', 'Catamayo', 'Paradero Parque Central de Catamayo', 'PARADERO', 'Centro', 'Av. Isidro Ayora'),
    -- Los Ríos
    ('Los Ríos', 'Babahoyo', 'Mercado 4 de Mayo', 'MERCADO', 'Centro', 'Av. 5 de Junio'),
    ('Los Ríos', 'Babahoyo', 'Paradero Malecón 9 de Octubre', 'PARADERO', 'Centro', 'Frente al río Babahoyo'),
    ('Los Ríos', 'Quevedo', 'Paradero Parque Central de Quevedo', 'PARADERO', 'Centro', 'Av. 7 de Octubre'),
    -- Manabí
    ('Manabí', 'Portoviejo', 'Mercado Central de Portoviejo', 'MERCADO', 'Centro', 'Calle Chile y Alajuela'),
    ('Manabí', 'Portoviejo', 'Paradero Parque La Rotonda', 'PARADERO', 'Norte', 'Av. Urbina y Manabí'),
    ('Manabí', 'Manta', 'Mercado Tarqui / Zona Comercial', 'MERCADO', 'Tarqui', 'Av. 108 y Calle 105'),
    ('Manabí', 'Chone', 'Paradero Parque de las Madres', 'PARADERO', 'Centro', 'Av. Carlos Alberto Aray'),
    -- Morona Santiago
    ('Morona Santiago', 'Morona (Macas)', 'Mercado Municipal de Macas', 'MERCADO', 'Centro', 'Calle 24 de Mayo y Soasti'),
    ('Morona Santiago', 'Morona (Macas)', 'Paradero Parque Cívico', 'PARADERO', 'Centro', 'Av. Amazonas'),
    ('Morona Santiago', 'Morona (Macas)', 'Parroquia Sevilla Don Bosco', 'PARROQUIA', 'Sevilla Don Bosco', 'Vía a Macas'),
    -- Napo
    ('Napo', 'Tena', 'Paradero Malecón de Tena', 'PARADERO', 'Centro', 'Av. 15 de Noviembre'),
    ('Napo', 'Tena', 'Mercado Central de Tena', 'MERCADO', 'Centro Sur', 'Vía a Archidona'),
    ('Napo', 'Tena', 'Parroquia Puerto Napo', 'PARROQUIA', 'Puerto Napo', 'Puente sobre el río Napo'),
    -- Orellana
    ('Orellana', 'Francisco de Orellana', 'Paradero Malecón de El Coca', 'PARADERO', 'Centro', 'Av. 9 de Octubre y Napo'),
    ('Orellana', 'Francisco de Orellana', 'Mercado Municipal de El Coca', 'MERCADO', 'Barrio Central', 'Av. Alejandro Labaka'),
    ('Orellana', 'Francisco de Orellana', 'Barrio Moretecocha', 'BARRIO', 'Moretecocha', 'Av. Quito'),
    -- Pastaza
    ('Pastaza', 'Pastaza (Puyo)', 'Paradero Parque 12 de Mayo', 'PARADERO', 'Centro de Puyo', 'Calle Ceslao Marín y 9 de Octubre'),
    ('Pastaza', 'Pastaza (Puyo)', 'Mercado Los Plátanos', 'MERCADO', 'Barrio Obrero', 'Av. Alberto Zambrano'),
    ('Pastaza', 'Pastaza (Puyo)', 'Parroquia Shell', 'PARROQUIA', 'Shell', 'Redondel de Shell'),
    -- Pichincha
    ('Pichincha', 'Quito', 'Estación Río Coca (Ecovía)', 'PARADERO', 'Jipijapa / Norte', 'Av. 6 de Diciembre y Río Coca'),
    ('Pichincha', 'Quito', 'Estación El Recreo', 'PARADERO', 'Chimbacalle / Sur', 'Av. Maldonado y Morán Valverde'),
    ('Pichincha', 'Quito', 'Mercado Mayorista de Quito', 'MERCADO', 'Solanda / Sur', 'Av. Teniente Hugo Ortiz y Ayapamba'),
    ('Pichincha', 'Quito', 'Parroquia Calderón', 'PARROQUIA', 'Calderón / Norte', 'Panamericana Norte km 14 y Carapungo'),
    ('Pichincha', 'Quito', 'Parroquia Tumbaco', 'PARROQUIA', 'Valle de Tumbaco', 'Av. Interoceánica y Juan Montalvo'),
    ('Pichincha', 'Rumiñahui (Sangolquí)', 'Paradero El Colibrí (Redondel)', 'PARADERO', 'Sangolquí', 'Autopista General Rumiñahui'),
    ('Pichincha', 'Cayambe', 'Mercado Diario de Cayambe', 'MERCADO', 'Centro', 'Calle Rocafuerte y Terán'),
    -- Santa Elena
    ('Santa Elena', 'Santa Elena', 'Mercado Municipal de Santa Elena', 'MERCADO', 'Centro', 'Av. 18 de Agosto'),
    ('Santa Elena', 'Santa Elena', 'Paradero Parque Vicente Rocafuerte', 'PARADERO', 'Centro', 'Frente a la Catedral'),
    ('Santa Elena', 'Salinas', 'Paradero Chipipe / Sector Hotelero', 'PARADERO', 'Chipipe', 'Malecón de Salinas'),
    -- Santo Domingo de los Tsáchilas
    ('Santo Domingo de los Tsáchilas', 'Santo Domingo', 'Paradero Círculo de los Continentes', 'PARADERO', 'Centro', 'Av. Quito y Tsáchila'),
    ('Santo Domingo de los Tsáchilas', 'Santo Domingo', 'Mercado Municipal 3 de Julio', 'MERCADO', 'Centro', 'Calle Guayaquil y Ambato'),
    ('Santo Domingo de los Tsáchilas', 'Santo Domingo', 'Parroquia Julio Moreno Espinosa', 'PARROQUIA', 'Julio Moreno', 'Vía a Quevedo km 7'),
    -- Sucumbíos
    ('Sucumbíos', 'Nueva Loja (Lago Agrio)', 'Paradero Parque Recreativo Nueva Loja', 'PARADERO', 'Centro', 'Av. Quito'),
    ('Sucumbíos', 'Nueva Loja (Lago Agrio)', 'Mercado Central de Lago Agrio', 'MERCADO', 'Centro', 'Calle Vicente Narváez'),
    ('Sucumbíos', 'Nueva Loja (Lago Agrio)', 'Parroquia El Eno', 'PARROQUIA', 'El Eno', 'Vía a El Coca'),
    -- Tungurahua
    ('Tungurahua', 'Ambato', 'Mercado Mayorista de Ambato', 'MERCADO', 'Huachi Loreto', 'Av. Bolivariana y Julio Jaramillo'),
    ('Tungurahua', 'Ambato', 'Mercado Modelo de Ambato', 'MERCADO', 'Centro', 'Av. Cevallos y Tomás Sevilla'),
    ('Tungurahua', 'Ambato', 'Paradero Parque Cevallos', 'PARADERO', 'Centro de Ambato', 'Calle Sucre y Lalama'),
    ('Tungurahua', 'Ambato', 'Sector Ficoa / Los Guaytambos', 'SECTOR', 'Ficoa', 'Av. Los Guaytambos'),
    ('Tungurahua', 'Ambato', 'Parroquia Pinllo', 'PARROQUIA', 'Pinllo', 'Parque Central de Pinllo'),
    ('Tungurahua', 'Ambato', 'Barrio Ingahurco', 'BARRIO', 'Ingahurco', 'Av. Las Américas y Colombia'),
    ('Tungurahua', 'Ambato', 'Paradero Hospital Regional Docente Ambato', 'REFERENCIA', 'La Merced', 'Av. Pasteur y Unidad Nacional'),
    ('Tungurahua', 'Baños de Agua Santa', 'Paradero Parque Palomino Flores', 'PARADERO', 'Centro de Baños', 'Calle Ambato y Thomas Halflants'),
    ('Tungurahua', 'San Pedro de Pelileo', 'Mercado República de Argentina', 'MERCADO', 'Centro de Pelileo', 'Av. Confraternidad'),
    ('Tungurahua', 'Santiago de Píllaro', 'Paradero Parque Central de Píllaro', 'PARADERO', 'Centro', 'Calle Bolívar y Sucre'),
    ('Tungurahua', 'Cevallos', 'Paradero Estación del Tren / Centro', 'PARADERO', 'Centro de Cevallos', 'Av. 13 de Mayo'),
    -- Zamora Chinchipe
    ('Zamora Chinchipe', 'Zamora', 'Paradero Parque Lineal de Zamora', 'PARADERO', 'Centro', 'Av. Héroes de Paquisha'),
    ('Zamora Chinchipe', 'Zamora', 'Mercado Centro Comercial Reina del Cisne', 'MERCADO', 'Centro', 'Calle José Luis Tamayo'),
    ('Zamora Chinchipe', 'Zamora', 'Parroquia Cumbaratza', 'PARROQUIA', 'Cumbaratza', 'Vía Troncal Amazónica')
) AS v(provincia, ciudad, nombre, tipo_punto, sector, direccion)
JOIN transporte.ciudades c
  ON lower(c.provincia) = lower(v.provincia)
 AND lower(c.nombre) = lower(v.ciudad)
ON CONFLICT (ciudad_id, nombre) DO NOTHING;

COMMIT;
