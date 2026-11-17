BEGIN;
ALTER TABLE transporte.politicas_reembolso DROP CONSTRAINT IF EXISTS politicas_reembolso_permite_parcial_check;
ALTER TABLE transporte.solicitudes_reembolso ADD COLUMN reserva_asiento_ids uuid[], ADD COLUMN base_centavos bigint, ADD COLUMN es_total boolean NOT NULL DEFAULT true;
UPDATE transporte.solicitudes_reembolso s SET base_centavos=c.total_pagado_centavos,reserva_asiento_ids=(SELECT array_agg(ra.id ORDER BY ra.id) FROM transporte.reserva_asientos ra WHERE ra.reserva_id=c.reserva_id)
FROM transporte.compras c WHERE c.id=s.compra_id;
ALTER TABLE transporte.solicitudes_reembolso ALTER COLUMN base_centavos SET NOT NULL, ALTER COLUMN reserva_asiento_ids SET NOT NULL;
ALTER TABLE transporte.solicitudes_reembolso ADD CHECK(base_centavos>=0 AND monto_centavos<=base_centavos),ADD CHECK(cardinality(reserva_asiento_ids)>0);
DROP INDEX transporte.reembolso_activo;
CREATE UNIQUE INDEX reembolso_activo ON transporte.solicitudes_reembolso(compra_id) WHERE estado IN('SOLICITADO','APROBADO');

CREATE FUNCTION transporte.elegibilidad_reembolso_asientos(p_compra uuid,p_asientos uuid[] DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE c transporte.compras; r transporte.reservas; v transporte.viajes; regla transporte.reglas_reembolso; ids uuid[]; base bigint; n integer; mins integer;
BEGIN
 SELECT * INTO c FROM transporte.compras WHERE id=p_compra; r:=transporte.reserva_autorizada(c.reserva_id);
 IF r.cliente_id IS DISTINCT FROM transporte.actor() AND NOT transporte.puede('reembolsos.gestionar',r.cooperativa_id,r.oficina_id) THEN RAISE EXCEPTION 'Sin permiso' USING ERRCODE='42501'; END IF;
 SELECT * INTO v FROM transporte.viajes WHERE id=r.viaje_id;
 IF c.estado<>'CONFIRMADA' OR v.salida<=now() OR v.estado NOT IN('PUBLICADO','EN_RUTA') THEN RETURN jsonb_build_object('elegible',false,'motivo','VIAJE_INICIADO_CANCELADO_O_ABORDADO'); END IF;
 IF c.politica_reembolso_id IS NULL THEN RETURN jsonb_build_object('elegible',false,'motivo','SIN_POLITICA_PUBLICADA_EN_LA_COMPRA'); END IF;
 SELECT array_agg(ra.id ORDER BY ra.id) INTO ids FROM transporte.reserva_asientos ra WHERE ra.reserva_id=r.id AND ra.estado='CONFIRMADO' AND (p_asientos IS NULL OR ra.id=ANY(p_asientos));
 IF ids IS NULL OR (p_asientos IS NOT NULL AND (cardinality(ids)<>cardinality(p_asientos) OR cardinality(p_asientos)<>(SELECT count(DISTINCT x) FROM unnest(p_asientos)x))) THEN RAISE EXCEPTION 'Pasajeros no disponibles' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM transporte.abordajes WHERE compra_id=c.id AND reserva_asiento_id=ANY(ids)) THEN RETURN jsonb_build_object('elegible',false,'motivo','VIAJE_INICIADO_CANCELADO_O_ABORDADO'); END IF;
 IF cardinality(ids)<(SELECT count(*) FROM transporte.reserva_asientos WHERE reserva_id=r.id AND estado='CONFIRMADO') AND NOT EXISTS(SELECT 1 FROM transporte.politicas_reembolso WHERE id=c.politica_reembolso_id AND permite_parcial) THEN RETURN jsonb_build_object('elegible',false,'motivo','POLITICA_NO_PERMITE_PARCIAL'); END IF;
 SELECT sum(l.base_centavos-l.descuento_centavos+l.servicio_centavos+l.iva_centavos),count(*) INTO base,n FROM transporte.cotizacion_lineas l JOIN transporte.cotizaciones q ON q.id=l.cotizacion_id JOIN transporte.pagos pa ON pa.id=c.pago_id JOIN transporte.intentos_pago i ON i.id=pa.intento_id
 WHERE q.reserva_id=r.id AND q.version=i.cotizacion_version AND l.reserva_asiento_id=ANY(ids);
 IF n<>cardinality(ids) OR base IS NULL OR base>c.total_pagado_centavos THEN RETURN jsonb_build_object('elegible',false,'motivo','REGLA_INCOMPLETA'); END IF;
 mins:=floor(extract(epoch FROM(v.salida-now()))/60)::integer;
 SELECT * INTO regla FROM transporte.reglas_reembolso WHERE politica_id=c.politica_reembolso_id AND int4range(minutos_desde,minutos_hasta,'[)') @> mins;
 IF regla.id IS NULL THEN RETURN jsonb_build_object('elegible',false,'motivo','REGLA_INCOMPLETA'); END IF;
 RETURN jsonb_build_object('elegible',true,'politicaId',c.politica_reembolso_id,'reglaId',regla.id,'minutos',mins,'porcentajeBp',regla.porcentaje_bp,'montoCentavos',round(base*regla.porcentaje_bp/10000.0)::bigint,'baseCentavos',base,'asientos',ids);
END $$;
CREATE OR REPLACE FUNCTION transporte.elegibilidad_reembolso(p_compra uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$SELECT transporte.elegibilidad_reembolso_asientos(p_compra,NULL)$$;
CREATE FUNCTION transporte.solicitar_reembolso_asientos(p_compra uuid,p_motivo text,p_clave text,p_asientos uuid[] DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE c transporte.compras; r transporte.reservas; e jsonb; ant transporte.solicitudes_reembolso; sid uuid; ordenados uuid[];
BEGIN
 SELECT * INTO c FROM transporte.compras WHERE id=p_compra; r:=transporte.reserva_autorizada(c.reserva_id);
 IF r.cliente_id IS DISTINCT FROM transporte.actor() AND NOT transporte.puede('reembolsos.gestionar',r.cooperativa_id,r.oficina_id) THEN RAISE EXCEPTION 'Sin permiso' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM transporte.compras WHERE id=c.id FOR UPDATE;
 SELECT array_agg(x ORDER BY x) INTO ordenados FROM unnest(p_asientos)x;
 SELECT * INTO ant FROM transporte.solicitudes_reembolso WHERE solicitado_por=transporte.actor() AND clave_intento=p_clave;
 IF ant.id IS NOT NULL THEN
  IF ant.compra_id<>c.id OR ant.motivo<>p_motivo OR ant.es_total IS DISTINCT FROM (p_asientos IS NULL) OR (p_asientos IS NOT NULL AND ant.reserva_asiento_ids IS DISTINCT FROM ordenados) THEN RAISE EXCEPTION 'Clave repetida con contenido distinto'; END IF;
  RETURN ant.id;
 END IF;
 IF length(trim(coalesce(p_motivo,''))) NOT BETWEEN 1 AND 500 OR length(trim(coalesce(p_clave,''))) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Motivo/clave inválidos'; END IF;
 e:=transporte.elegibilidad_reembolso_asientos(c.id,p_asientos);IF NOT(e->>'elegible')::boolean THEN RAISE EXCEPTION 'No elegible'; END IF;
 INSERT INTO transporte.solicitudes_reembolso(cooperativa_id,compra_id,solicitado_por,politica_id,regla_id,porcentaje_bp,monto_centavos,motivo,clave_intento,reserva_asiento_ids,base_centavos,es_total)
 VALUES(c.cooperativa_id,c.id,transporte.actor(),(e->>'politicaId')::uuid,(e->>'reglaId')::uuid,(e->>'porcentajeBp')::integer,(e->>'montoCentavos')::bigint,p_motivo,p_clave,ARRAY(SELECT value::uuid FROM jsonb_array_elements_text(e->'asientos')),(e->>'baseCentavos')::bigint,p_asientos IS NULL) RETURNING id INTO sid;RETURN sid;
END $$;
CREATE OR REPLACE FUNCTION transporte.solicitar_reembolso(p_compra uuid,p_motivo text,p_clave text) RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$SELECT transporte.solicitar_reembolso_asientos(p_compra,p_motivo,p_clave,NULL)$$;
CREATE OR REPLACE FUNCTION transporte.decidir_reembolso(p_solicitud uuid,p_aprobar boolean,p_motivo text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE s transporte.solicitudes_reembolso;c transporte.compras;r transporte.reservas;
BEGIN
 SELECT * INTO s FROM transporte.solicitudes_reembolso WHERE id=p_solicitud;SELECT * INTO c FROM transporte.compras WHERE id=s.compra_id;SELECT * INTO r FROM transporte.reservas WHERE id=c.reserva_id;
 PERFORM transporte.exigir('reembolsos.gestionar',r.cooperativa_id,r.oficina_id);PERFORM 1 FROM transporte.compras WHERE id=c.id FOR UPDATE;SELECT * INTO s FROM transporte.solicitudes_reembolso WHERE id=p_solicitud FOR UPDATE;
 IF s.estado<>'SOLICITADO' THEN IF(p_aprobar AND s.estado='APROBADO')OR(NOT p_aprobar AND s.estado='RECHAZADO')THEN RETURN;END IF;RAISE EXCEPTION 'Solicitud ya resuelta';END IF;
 IF length(trim(coalesce(p_motivo,''))) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Motivo requerido';END IF;
 IF p_aprobar THEN
  IF EXISTS(SELECT 1 FROM transporte.abordajes WHERE compra_id=c.id AND reserva_asiento_id=ANY(s.reserva_asiento_ids)) OR (SELECT count(*) FROM transporte.reserva_asientos WHERE reserva_id=r.id AND id=ANY(s.reserva_asiento_ids) AND estado='CONFIRMADO')<>cardinality(s.reserva_asiento_ids) THEN RAISE EXCEPTION 'Pasajeros ya abordados o cancelados';END IF;
  UPDATE transporte.reserva_asientos SET estado='LIBERADO' WHERE reserva_id=r.id AND id=ANY(s.reserva_asiento_ids);
  IF NOT EXISTS(SELECT 1 FROM transporte.reserva_asientos WHERE reserva_id=r.id AND estado='CONFIRMADO') THEN
   UPDATE transporte.compras SET estado='CANCELADA' WHERE id=c.id;UPDATE transporte.reservas SET estado='CANCELADA' WHERE id=r.id;UPDATE transporte.boletos SET estado='ANULADO' WHERE compra_id=c.id;
  ELSE UPDATE transporte.boletos SET estado='PENDIENTE_EMISION',archivo_id=NULL WHERE compra_id=c.id;END IF;
 END IF;
 UPDATE transporte.solicitudes_reembolso SET estado=CASE WHEN p_aprobar THEN 'APROBADO' ELSE 'RECHAZADO' END,decision_motivo=p_motivo,decidido_por=transporte.actor(),decidido_at=now() WHERE id=s.id;
END $$;
CREATE OR REPLACE FUNCTION transporte.registrar_abono_reembolso(p_solicitud uuid,p_referencia text,p_evidencia uuid,p_clave text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE s transporte.solicitudes_reembolso; c transporte.compras; r transporte.reservas; ant transporte.reembolsos; rid uuid;
BEGIN
 SELECT * INTO s FROM transporte.solicitudes_reembolso WHERE id=p_solicitud; SELECT * INTO c FROM transporte.compras WHERE id=s.compra_id; SELECT * INTO r FROM transporte.reservas WHERE id=c.reserva_id;
 PERFORM transporte.exigir('reembolsos.gestionar',r.cooperativa_id,r.oficina_id); PERFORM 1 FROM transporte.compras WHERE id=c.id FOR UPDATE; SELECT * INTO s FROM transporte.solicitudes_reembolso WHERE id=p_solicitud FOR UPDATE;
 SELECT * INTO ant FROM transporte.reembolsos WHERE clave_intento=p_clave;
 IF ant.id IS NOT NULL THEN IF ant.solicitud_id<>s.id OR ant.referencia_externa<>p_referencia THEN RAISE EXCEPTION 'Clave repetida con distinto abono'; END IF; RETURN ant.id; END IF;
 IF s.estado<>'APROBADO' OR s.monto_centavos>c.total_pagado_centavos OR s.monto_centavos+coalesce((SELECT sum(monto_centavos) FROM transporte.reembolsos WHERE pago_id=c.pago_id),0)>c.total_pagado_centavos OR length(trim(coalesce(p_clave,'')))=0 THEN RAISE EXCEPTION 'Abono no permitido'; END IF;
 IF p_evidencia IS NOT NULL AND NOT EXISTS(SELECT 1 FROM transporte.archivos WHERE id=p_evidencia AND cooperativa_id=c.cooperativa_id AND validado_servidor AND categoria='REEMBOLSO') THEN RAISE EXCEPTION 'Evidencia no valida'; END IF;
 INSERT INTO transporte.reembolsos(cooperativa_id,solicitud_id,pago_id,monto_centavos,ejecutado_por,referencia_externa,evidencia_archivo_id,clave_intento) VALUES(c.cooperativa_id,s.id,c.pago_id,s.monto_centavos,transporte.actor(),p_referencia,p_evidencia,p_clave) RETURNING id INTO rid;
 UPDATE transporte.solicitudes_reembolso SET estado='EJECUTADO' WHERE id=s.id; UPDATE transporte.compras SET estado=CASE WHEN EXISTS(SELECT 1 FROM transporte.reserva_asientos WHERE reserva_id=r.id AND estado='CONFIRMADO') THEN estado ELSE 'REEMBOLSADA' END WHERE id=c.id;
 INSERT INTO transporte.notificaciones(usuario_id,cooperativa_id,tipo,canal,evento_clave,payload) VALUES(r.cliente_id,c.cooperativa_id,'REEMBOLSO_REGISTRADO','APP','reembolso:'||rid,jsonb_build_object('compraId',c.id,'montoCentavos',s.monto_centavos)); RETURN rid;
END $$;

REVOKE ALL ON FUNCTION transporte.elegibilidad_reembolso_asientos(uuid,uuid[]),transporte.solicitar_reembolso_asientos(uuid,text,text,uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.elegibilidad_reembolso_asientos(uuid,uuid[]),transporte.solicitar_reembolso_asientos(uuid,text,text,uuid[]) TO transporte_runtime;
COMMIT;
