BEGIN;

CREATE TABLE transporte.notas_internas_reembolso (
  solicitud_id uuid PRIMARY KEY REFERENCES transporte.solicitudes_reembolso(id) ON DELETE CASCADE,
  nota varchar(1000) NOT NULL,
  actualizado_por uuid NOT NULL REFERENCES transporte.usuarios(id),
  actualizado_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE transporte.notas_internas_reembolso ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON transporte.notas_internas_reembolso TO transporte_runtime;

CREATE POLICY gestionar ON transporte.notas_internas_reembolso
  TO transporte_runtime
  USING (EXISTS (
    SELECT 1
    FROM transporte.solicitudes_reembolso s
    JOIN transporte.compras c ON c.id = s.compra_id
    JOIN transporte.reservas r ON r.id = c.reserva_id
    WHERE s.id = notas_internas_reembolso.solicitud_id
      AND transporte.puede('reembolsos.gestionar', r.cooperativa_id, r.oficina_id)
      AND (r.oficina_id IS NOT NULL OR transporte.puede('reembolsos.gestionar') OR EXISTS (
        SELECT 1 FROM transporte.membresias m
        WHERE m.usuario_id = transporte.actor() AND m.activa
          AND m.cooperativa_id = r.cooperativa_id AND m.oficina_id IS NULL
      ))
  ));

COMMIT;
