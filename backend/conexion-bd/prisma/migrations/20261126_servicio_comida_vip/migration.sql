BEGIN;
INSERT INTO transporte.equipamientos (codigo, nombre)
VALUES ('COMIDA', 'Bocaditos y bebidas')
ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre;
COMMIT;
