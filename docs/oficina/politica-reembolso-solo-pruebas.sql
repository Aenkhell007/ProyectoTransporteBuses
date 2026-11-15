-- OPCIONAL: SOLO PARA LA DEMOSTRACIÓN ACADÉMICA.
-- No representa una política comercial o legal de Gran Continental.
-- Si se ejecuta, nuevas compras de esta cooperativa usarán esta política
-- mientras permanezca publicada. No ejecutar para operación comercial.
-- Conserva cualquier política ya publicada; no la sustituye.
BEGIN;
DO $politica$
DECLARE v_coop uuid; v_id uuid; v_version integer;
BEGIN
  SELECT c.id INTO STRICT v_coop FROM transporte.cooperativas c WHERE c.ruc='1805381579001';
  PERFORM pg_advisory_xact_lock(hashtext('demo-oficina-gran-continental'));
  IF NOT EXISTS(SELECT 1 FROM transporte.politicas_reembolso p WHERE p.cooperativa_id=v_coop AND p.estado='PUBLICADA') THEN
    SELECT coalesce(max(p.numero_version),0)+1 INTO v_version FROM transporte.politicas_reembolso p WHERE p.cooperativa_id=v_coop;
    INSERT INTO transporte.politicas_reembolso(cooperativa_id,numero_version,estado,condiciones,plazo_abono_dias)
      VALUES(v_coop,v_version,'BORRADOR','DEMO ACADÉMICA: 50% antes de la salida. No realizar devoluciones reales; reemplazar por política autorizada antes de operar.',5) RETURNING id INTO v_id;
    INSERT INTO transporte.reglas_reembolso(cooperativa_id,politica_id,minutos_desde,minutos_hasta,porcentaje_bp)
      VALUES(v_coop,v_id,0,NULL,5000);
    UPDATE transporte.politicas_reembolso SET estado='PUBLICADA',publicada_at=now() WHERE id=v_id;
  END IF;
END $politica$;
COMMIT;
