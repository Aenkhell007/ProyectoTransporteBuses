BEGIN;
ALTER TABLE transporte.cuentas_bancarias ADD COLUMN predeterminada boolean NOT NULL DEFAULT false;
ALTER TABLE transporte.cuentas_bancarias ADD CONSTRAINT cuenta_predeterminada_activa CHECK(NOT predeterminada OR activa);
CREATE UNIQUE INDEX cuenta_predeterminada_por_cooperativa ON transporte.cuentas_bancarias(cooperativa_id) WHERE predeterminada;
ALTER TABLE transporte.politica_comprobantes ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>=0);

-- El QR se guarda junto con sus metadatos en la transacción, compartido entre equipos.
CREATE TABLE transporte.pagos_qr_contenidos (
 archivo_id uuid PRIMARY KEY REFERENCES transporte.archivos(id),
 cooperativa_id uuid NOT NULL REFERENCES transporte.cooperativas(id),
 contenido bytea NOT NULL CHECK(octet_length(contenido) BETWEEN 1 AND 5242880)
);
ALTER TABLE transporte.pagos_qr_contenidos ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT ON transporte.pagos_qr_contenidos TO transporte_runtime;
CREATE POLICY gestionar_qr ON transporte.pagos_qr_contenidos FOR ALL TO transporte_runtime
 USING(transporte.puede('pagos.configurar',cooperativa_id))
 WITH CHECK(transporte.puede('pagos.configurar',cooperativa_id) AND EXISTS(
 SELECT 1 FROM transporte.archivos a WHERE a.id=archivo_id AND a.cooperativa_id=pagos_qr_contenidos.cooperativa_id
 AND a.categoria='QR_BANCARIO' AND a.propietario_id=transporte.actor()));
CREATE POLICY leer_qr_configuracion ON transporte.archivos FOR SELECT TO transporte_runtime
 USING(categoria='QR_BANCARIO' AND transporte.puede('pagos.configurar',cooperativa_id));

-- Autoriza mediante la misma reserva que permite consultar los datos del pago.
CREATE FUNCTION transporte.qr_cuenta_cliente(p_reserva uuid,p_cuenta uuid) RETURNS bytea
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE resultado bytea; datos jsonb; qr uuid;
BEGIN
 datos:=transporte.consultar_pago_cliente(p_reserva);
 IF datos->'intento'->>'cuentaId'=p_cuenta::text AND datos->'intento'->>'estado' IN('PENDIENTE','EN_REVISION','APROBADO') THEN
  qr:=nullif(datos->'intento'->'cuentaSnapshot'->>'qr_archivo_id','')::uuid;
  SELECT q.contenido INTO resultado FROM transporte.pagos_qr_contenidos q JOIN transporte.reservas r ON r.cooperativa_id=q.cooperativa_id
  WHERE r.id=p_reserva AND q.archivo_id=qr;
  RETURN resultado;
 END IF;
 SELECT q.contenido INTO resultado FROM transporte.pagos_qr_contenidos q
 JOIN transporte.cuentas_bancarias c ON c.qr_archivo_id=q.archivo_id AND c.cooperativa_id=q.cooperativa_id
 JOIN transporte.bancos b ON b.id=c.banco_id AND b.activo
 JOIN transporte.reservas r ON r.cooperativa_id=c.cooperativa_id
 WHERE r.id=p_reserva AND c.id=p_cuenta AND c.activa;
 RETURN resultado;
END $$;
REVOKE ALL ON FUNCTION transporte.qr_cuenta_cliente(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.qr_cuenta_cliente(uuid,uuid) TO transporte_runtime;
CREATE FUNCTION transporte.cuenta_predeterminada_cliente(p_reserva uuid) RETURNS uuid
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE resultado uuid;
BEGIN
 PERFORM transporte.consultar_pago_cliente(p_reserva);
 SELECT c.id INTO resultado FROM transporte.cuentas_bancarias c JOIN transporte.reservas r ON r.cooperativa_id=c.cooperativa_id
 WHERE r.id=p_reserva AND c.activa AND c.predeterminada;
 RETURN resultado;
END $$;
REVOKE ALL ON FUNCTION transporte.cuenta_predeterminada_cliente(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.cuenta_predeterminada_cliente(uuid) TO transporte_runtime;
COMMIT;
