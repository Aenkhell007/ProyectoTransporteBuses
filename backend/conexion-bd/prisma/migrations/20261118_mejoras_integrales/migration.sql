-- Migración integral: catálogos (provincias, cantones, marcas), ámbito de grupos, recargo VIP e índices de rendimiento.
-- Idempotente para aplicación segura sobre entornos existentes.

-- 1. Catálogo de provincias y vínculo con ciudades (cantones)
CREATE TABLE IF NOT EXISTS transporte.provincias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre varchar(100) NOT NULL,
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  updated_at timestamptz(6) NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS provincias_nombre_lower_uidx ON transporte.provincias (lower(nombre));

INSERT INTO transporte.provincias (nombre)
SELECT DISTINCT trim(provincia)
FROM transporte.ciudades
WHERE trim(coalesce(provincia, '')) <> ''
ON CONFLICT DO NOTHING;

ALTER TABLE transporte.ciudades
  ADD COLUMN IF NOT EXISTS provincia_id uuid REFERENCES transporte.provincias(id);

UPDATE transporte.ciudades c
SET provincia_id = p.id
FROM transporte.provincias p
WHERE c.provincia_id IS NULL AND lower(trim(c.provincia)) = lower(p.nombre);

-- 2. Catálogo de marcas de buses (chasis y carrocería)
CREATE TABLE IF NOT EXISTS transporte.marcas_bus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre varchar(100) NOT NULL,
  tipo varchar(20) NOT NULL DEFAULT 'AMBAS' CHECK (tipo IN ('CHASIS', 'CARROCERIA', 'AMBAS')),
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  updated_at timestamptz(6) NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS marcas_bus_nombre_tipo_uidx ON transporte.marcas_bus (lower(nombre), tipo);

INSERT INTO transporte.marcas_bus (nombre, tipo) VALUES
  ('Mercedes-Benz', 'CHASIS'),
  ('Hino', 'CHASIS'),
  ('Scania', 'CHASIS'),
  ('Volvo', 'CHASIS'),
  ('Yutong', 'AMBAS'),
  ('Marcopolo', 'CARROCERIA'),
  ('Varela', 'CARROCERIA'),
  ('Miral', 'CARROCERIA'),
  ('Cepeda', 'CARROCERIA'),
  ('Irizar', 'CARROCERIA')
ON CONFLICT DO NOTHING;

-- 3. Ámbito de grupos de buses (INTERPROVINCIAL vs URBANO) y recargo VIP configurable
ALTER TABLE transporte.grupos_bus
  ADD COLUMN IF NOT EXISTS ambito varchar(20) NOT NULL DEFAULT 'INTERPROVINCIAL'
  CHECK (ambito IN ('INTERPROVINCIAL', 'URBANO'));

ALTER TABLE transporte.config_cooperativa
  ADD COLUMN IF NOT EXISTS recargo_vip_bp integer NOT NULL DEFAULT 2500
  CHECK (recargo_vip_bp BETWEEN 0 AND 10000);

-- 4. Unicidad normalizada de placas de buses (mayúsculas)
CREATE UNIQUE INDEX IF NOT EXISTS buses_placa_upper_uidx ON transporte.buses (upper(placa));

-- 5. Índices de rendimiento para consultas críticas de búsqueda, oficina, reportes y administración
CREATE INDEX IF NOT EXISTS viajes_publicado_salida_idx ON transporte.viajes (salida) WHERE estado = 'PUBLICADO';
CREATE INDEX IF NOT EXISTS viajes_coop_salida_idx ON transporte.viajes (cooperativa_id, salida);
CREATE INDEX IF NOT EXISTS ruta_paradas_terminal_ruta_idx ON transporte.ruta_paradas (terminal_id, ruta_id, orden);
CREATE INDEX IF NOT EXISTS frecuencias_ruta_idx ON transporte.frecuencias (ruta_id);
CREATE INDEX IF NOT EXISTS reservas_viaje_idx ON transporte.reservas (viaje_id);
CREATE INDEX IF NOT EXISTS reservas_coop_created_idx ON transporte.reservas (cooperativa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS intentos_pago_reserva_created_idx ON transporte.intentos_pago (reserva_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pagos_coop_confirmado_idx ON transporte.pagos (cooperativa_id, confirmado_at DESC);
CREATE INDEX IF NOT EXISTS compras_coop_created_idx ON transporte.compras (cooperativa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reembolsos_coop_ejecutado_idx ON transporte.reembolsos (cooperativa_id, ejecutado_at DESC);
CREATE INDEX IF NOT EXISTS usuarios_created_idx ON transporte.usuarios (created_at DESC);
CREATE INDEX IF NOT EXISTS sesiones_usuario_idx ON transporte.sesiones (usuario_id);

-- 6. Permisos de lectura/escritura para el rol de ejecución bajo RLS
ALTER TABLE transporte.provincias ENABLE ROW LEVEL SECURITY;
ALTER TABLE transporte.marcas_bus ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'transporte' AND tablename = 'provincias' AND policyname = 'leer_provincias') THEN
    CREATE POLICY leer_provincias ON transporte.provincias FOR SELECT TO transporte_runtime USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'transporte' AND tablename = 'provincias' AND policyname = 'admin_provincias') THEN
    CREATE POLICY admin_provincias ON transporte.provincias FOR ALL TO transporte_runtime USING (transporte.puede('identidad.admin')) WITH CHECK (transporte.puede('identidad.admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'transporte' AND tablename = 'marcas_bus' AND policyname = 'leer_marcas_bus') THEN
    CREATE POLICY leer_marcas_bus ON transporte.marcas_bus FOR SELECT TO transporte_runtime USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'transporte' AND tablename = 'marcas_bus' AND policyname = 'admin_marcas_bus') THEN
    CREATE POLICY admin_marcas_bus ON transporte.marcas_bus FOR ALL TO transporte_runtime USING (transporte.puede('identidad.admin')) WITH CHECK (transporte.puede('identidad.admin'));
  END IF;
END $$;
GRANT SELECT, INSERT, UPDATE ON transporte.provincias, transporte.marcas_bus TO transporte_runtime;
