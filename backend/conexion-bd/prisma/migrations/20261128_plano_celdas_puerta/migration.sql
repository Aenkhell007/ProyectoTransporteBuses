-- Permitir celdas tipo PUERTA en planos de buses urbanos y rurales (ocupan 2 espacios como Baño y no llevan código ni clase)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'transporte.plano_celdas'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%PASILLO%'
      AND pg_get_constraintdef(oid) NOT LIKE '%codigo%'
  LOOP
    EXECUTE format('ALTER TABLE transporte.plano_celdas DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE transporte.plano_celdas
  ADD CONSTRAINT plano_celdas_tipo_chk
  CHECK (tipo IN ('ASIENTO', 'PASILLO', 'BLOQUE', 'PUERTA'));
