BEGIN;
-- Las cooperativas importadas o creadas antes del alta transaccional pueden
-- carecer de configuración. Conserva todos los valores ya existentes.
INSERT INTO transporte.config_cooperativa (cooperativa_id)
SELECT c.id FROM transporte.cooperativas c
WHERE NOT EXISTS (
  SELECT 1 FROM transporte.config_cooperativa k WHERE k.cooperativa_id = c.id
)
ON CONFLICT (cooperativa_id) DO NOTHING;
COMMIT;
