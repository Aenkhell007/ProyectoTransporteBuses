BEGIN;
-- La cuenta cliente puede consultar sus pasajeros sin abrir el catálogo privado de planos.
CREATE FUNCTION transporte.asientos_reembolso(p_reserva uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE r transporte.reservas; resultado jsonb;
BEGIN
 r:=transporte.reserva_autorizada(p_reserva);
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',ra.id,'estado',ra.estado,'codigo',pc.codigo,'piso',pc.piso,'nombre',p.nombres||' '||p.apellidos,'pagado_centavos',l.base_centavos-l.descuento_centavos+l.servicio_centavos+l.iva_centavos) ORDER BY pc.piso,pc.codigo),'[]'::jsonb) INTO resultado
 FROM transporte.reserva_asientos ra JOIN transporte.plano_celdas pc ON pc.id=ra.asiento_id
 JOIN transporte.pasajeros p ON p.reserva_asiento_id=ra.id
 JOIN transporte.compras c ON c.reserva_id=ra.reserva_id JOIN transporte.pagos pa ON pa.id=c.pago_id
 JOIN transporte.intentos_pago i ON i.id=pa.intento_id
 JOIN transporte.cotizaciones q ON q.reserva_id=ra.reserva_id AND q.version=i.cotizacion_version
 JOIN transporte.cotizacion_lineas l ON l.cotizacion_id=q.id AND l.reserva_asiento_id=ra.id
 WHERE ra.reserva_id=r.id;
 RETURN resultado;
END $$;
REVOKE ALL ON FUNCTION transporte.asientos_reembolso(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.asientos_reembolso(uuid) TO transporte_runtime;
COMMIT;
