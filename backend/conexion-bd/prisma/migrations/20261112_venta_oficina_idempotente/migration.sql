BEGIN;
-- Una misma petición de venta conserva su reserva incluso si se pierde la respuesta.
CREATE TABLE transporte.ventas_oficina_peticiones (
 usuario_id uuid NOT NULL REFERENCES transporte.usuarios(id),
 clave uuid NOT NULL,
 reserva_id uuid NOT NULL REFERENCES transporte.reservas(id),
 huella char(64) NOT NULL CHECK (huella ~ '^[0-9a-f]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(usuario_id,clave)
);
ALTER TABLE transporte.ventas_oficina_peticiones ENABLE ROW LEVEL SECURITY;
CREATE POLICY venta_peticion_propia ON transporte.ventas_oficina_peticiones
 FOR ALL TO transporte_runtime USING(usuario_id=transporte.actor())
 WITH CHECK(usuario_id=transporte.actor() AND EXISTS (
 SELECT 1 FROM transporte.reservas r WHERE r.id=reserva_id AND r.oficina_id IS NOT NULL
 AND transporte.puede('oficina.vender',r.cooperativa_id,r.oficina_id)));
GRANT SELECT,INSERT ON transporte.ventas_oficina_peticiones TO transporte_runtime;
COMMIT;
