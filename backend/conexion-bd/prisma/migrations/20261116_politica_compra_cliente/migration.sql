BEGIN;
-- La política histórica de una compra es visible solo dentro de una reserva autorizada.
CREATE FUNCTION transporte.politica_reembolso_compra(p_reserva uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE r transporte.reservas; resultado jsonb;
BEGIN
 r:=transporte.reserva_autorizada(p_reserva);
 SELECT jsonb_build_object('numero_version',p.numero_version,'condiciones',p.condiciones,'plazo_abono_dias',p.plazo_abono_dias,'permite_parcial',p.permite_parcial) INTO resultado
 FROM transporte.compras c JOIN transporte.politicas_reembolso p ON p.id=c.politica_reembolso_id WHERE c.reserva_id=r.id;
 RETURN resultado;
END $$;
REVOKE ALL ON FUNCTION transporte.politica_reembolso_compra(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.politica_reembolso_compra(uuid) TO transporte_runtime;
COMMIT;
