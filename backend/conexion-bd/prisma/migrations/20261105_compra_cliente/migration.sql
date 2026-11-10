BEGIN;

-- Los contactos opcionales de acompañantes se conservan sin crear usuarios.
ALTER TABLE transporte.pasajeros ADD COLUMN email varchar(254), ADD COLUMN telefono varchar(25);

-- Helper privado: sus envoltorios públicos/autenticados comprueban el ámbito.
CREATE FUNCTION transporte.compra_viaje_datos(p_id uuid,p_origen integer,p_destino integer) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
SELECT jsonb_build_object('viaje_id',v.id,'cooperativa',co.nombre,'cooperativa_id',co.id,
 'tipo_viaje',f.tipo_viaje,'salida',v.salida+po.minutos_desde_origen*interval '1 minute',
 'llegada',v.salida+pd.minutos_desde_origen*interval '1 minute',
 'origen_orden',po.orden,'destino_orden',pd.orden,
 'origen',jsonb_build_object('orden',po.orden,'ciudad_id',ci.id,'ciudad',ci.nombre,'terminal',to1.nombre),
 'destino',jsonb_build_object('orden',pd.orden,'ciudad_id',cd.id,'ciudad',cd.nombre,'terminal',td.nombre),
 'bus',jsonb_build_object('id',b.id,'unidad',b.unidad,'placa',b.placa,'chasis',b.chasis,'carroceria',b.carroceria,
  'grupo',g.nombre,'plano_id',v.plano_id,'pisos',pl.pisos,'foto_url',null,'carroceria_modelo',null,
  'servicios',coalesce((SELECT jsonb_agg(e.codigo ORDER BY e.codigo) FROM transporte.bus_equipamiento be
    JOIN transporte.equipamientos e ON e.id=be.equipamiento_id WHERE be.bus_id=b.id),'[]'::jsonb)),
 'clases',coalesce((SELECT jsonb_agg(DISTINCT cl.codigo) FROM transporte.tarifas t JOIN transporte.clases_asiento cl ON cl.id=t.clase_id
  WHERE t.frecuencia_id=f.id AND t.grupo_id=b.grupo_id AND t.origen_orden=po.orden AND t.destino_orden=pd.orden
   AND t.activa AND t.vigencia @> (v.salida AT TIME ZONE 'America/Guayaquil')::date),'[]'::jsonb),
 'paradas',(SELECT jsonb_agg(jsonb_build_object('orden',rp.orden,'terminal',te.nombre,'ciudad',ct.nombre,
  'hora',v.salida+rp.minutos_desde_origen*interval '1 minute') ORDER BY rp.orden)
  FROM transporte.ruta_paradas rp JOIN transporte.terminales te ON te.id=rp.terminal_id JOIN transporte.ciudades ct ON ct.id=te.ciudad_id WHERE rp.ruta_id=f.ruta_id))
FROM transporte.viajes v JOIN transporte.frecuencias f ON f.id=v.frecuencia_id JOIN transporte.buses b ON b.id=v.bus_id
JOIN transporte.cooperativas co ON co.id=v.cooperativa_id JOIN transporte.grupos_bus g ON g.id=b.grupo_id JOIN transporte.planos pl ON pl.id=v.plano_id
JOIN transporte.ruta_paradas po ON po.ruta_id=f.ruta_id AND po.orden=p_origen
JOIN transporte.ruta_paradas pd ON pd.ruta_id=f.ruta_id AND pd.orden=p_destino
JOIN transporte.terminales to1 ON to1.id=po.terminal_id JOIN transporte.ciudades ci ON ci.id=to1.ciudad_id
JOIN transporte.terminales td ON td.id=pd.terminal_id JOIN transporte.ciudades cd ON cd.id=td.ciudad_id WHERE v.id=p_id
$$;

CREATE FUNCTION transporte.compra_catalogos() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
SELECT jsonb_build_object(
 'ciudades',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'nombre',nombre,'provincia',provincia) ORDER BY nombre) FROM transporte.ciudades WHERE activa),'[]'::jsonb),
 'cooperativas',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'nombre',nombre) ORDER BY nombre) FROM transporte.cooperativas WHERE activa),'[]'::jsonb),
 'chasis',coalesce((SELECT jsonb_agg(x.chasis) FROM(SELECT DISTINCT chasis FROM transporte.buses b JOIN transporte.cooperativas c ON c.id=b.cooperativa_id WHERE b.activo AND c.activa ORDER BY chasis)x),'[]'::jsonb),
 'carrocerias',coalesce((SELECT jsonb_agg(x.carroceria) FROM(SELECT DISTINCT carroceria FROM transporte.buses b JOIN transporte.cooperativas c ON c.id=b.cooperativa_id WHERE b.activo AND c.activa ORDER BY carroceria)x),'[]'::jsonb),
 'destinos',coalesce((SELECT jsonb_agg(x) FROM(SELECT ci.id ciudad_id,ci.nombre,min(t.precio_centavos) tarifa_desde_centavos
 FROM transporte.viajes v JOIN transporte.frecuencias f ON f.id=v.frecuencia_id JOIN transporte.buses b ON b.id=v.bus_id
 JOIN transporte.cooperativas c ON c.id=v.cooperativa_id JOIN transporte.tarifas t ON t.frecuencia_id=f.id AND t.grupo_id=b.grupo_id
 JOIN transporte.ruta_paradas rp ON rp.ruta_id=f.ruta_id AND rp.orden=t.destino_orden JOIN transporte.terminales te ON te.id=rp.terminal_id
 JOIN transporte.ciudades ci ON ci.id=te.ciudad_id WHERE v.estado='PUBLICADO' AND v.salida>now() AND b.activo AND c.activa AND f.activa AND t.activa AND ci.activa
 AND t.vigencia @> (v.salida AT TIME ZONE 'America/Guayaquil')::date GROUP BY ci.id ORDER BY ci.nombre LIMIT 10)x),'[]'::jsonb))
$$;

-- Consulta completa antes de filtrar/ordenar/paginar: no recorta a las primeras 50 filas.
CREATE FUNCTION transporte.compra_buscar(p jsonb) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
WITH candidatos AS (
 SELECT v.id,po.orden o,pd.orden d,co.nombre coop,
 v.salida+po.minutos_desde_origen*interval '1 minute' salida, x.libres,tf.precio
 FROM transporte.viajes v JOIN transporte.cooperativas co ON co.id=v.cooperativa_id JOIN transporte.frecuencias f ON f.id=v.frecuencia_id
 JOIN transporte.buses b ON b.id=v.bus_id JOIN transporte.ruta_paradas po ON po.ruta_id=f.ruta_id
 JOIN transporte.terminales tor ON tor.id=po.terminal_id JOIN transporte.ruta_paradas pd ON pd.ruta_id=f.ruta_id JOIN transporte.terminales tde ON tde.id=pd.terminal_id
 CROSS JOIN LATERAL(SELECT count(*) libres FROM transporte.plano_celdas pc JOIN transporte.clases_asiento cla ON cla.id=pc.clase_id
 WHERE pc.plano_id=v.plano_id AND pc.tipo='ASIENTO' AND pc.activa AND(nullif(p->>'clase','') IS NULL OR cla.codigo=p->>'clase')
 AND NOT EXISTS(SELECT 1 FROM transporte.reserva_asientos a WHERE a.viaje_id=v.id AND a.asiento_id=pc.id
 AND(a.estado='CONFIRMADO' OR(a.estado='RETENIDO' AND a.expires_at>now())) AND int4range(a.origen_orden,a.destino_orden,'[)') && int4range(least(po.orden,pd.orden),greatest(po.orden,pd.orden),'[)')))x
 CROSS JOIN LATERAL(SELECT min(t.precio_centavos) precio FROM transporte.tarifas t JOIN transporte.clases_asiento cl ON cl.id=t.clase_id
 WHERE t.frecuencia_id=f.id AND t.grupo_id=b.grupo_id AND t.origen_orden=po.orden AND t.destino_orden=pd.orden AND t.activa
 AND t.vigencia @> (v.salida AT TIME ZONE 'America/Guayaquil')::date AND(nullif(p->>'clase','') IS NULL OR cl.codigo=p->>'clase'))tf
 WHERE v.estado='PUBLICADO' AND v.salida>now() AND co.activa AND f.activa AND b.activo
 AND(v.salida AT TIME ZONE 'America/Guayaquil')::date=(p->>'fecha')::date
 AND tor.ciudad_id=(p->>'origen')::uuid AND tde.ciudad_id=(p->>'destino')::uuid AND po.orden<pd.orden
 AND(f.tipo_viaje='CON_PARADAS' OR(po.orden=(SELECT min(orden) FROM transporte.ruta_paradas WHERE ruta_id=f.ruta_id) AND pd.orden=(SELECT max(orden) FROM transporte.ruta_paradas WHERE ruta_id=f.ruta_id)))
 AND(nullif(p->>'cooperativa','') IS NULL OR co.id=(p->>'cooperativa')::uuid)
 AND(nullif(p->>'tipo_viaje','') IS NULL OR f.tipo_viaje=p->>'tipo_viaje')
 AND(nullif(p->>'chasis','') IS NULL OR b.chasis ILIKE '%'||(p->>'chasis')||'%')
 AND(nullif(p->>'carroceria','') IS NULL OR b.carroceria ILIKE '%'||(p->>'carroceria')||'%')
 AND x.libres>=(p->>'cantidad')::integer AND tf.precio IS NOT NULL
), filtrados AS(SELECT *,row_number() OVER(ORDER BY CASE WHEN p->>'orden'='precio' THEN precio END,salida,id,o,d) rn
 FROM candidatos WHERE (nullif(p->>'precio_min','') IS NULL OR precio>=(p->>'precio_min')::bigint)
 AND(nullif(p->>'precio_max','') IS NULL OR precio<=(p->>'precio_max')::bigint)
 AND(nullif(p->>'hora','') IS NULL OR CASE p->>'hora'
 WHEN 'MADRUGADA' THEN extract(hour FROM salida AT TIME ZONE 'America/Guayaquil')<6
 WHEN 'MANANA' THEN extract(hour FROM salida AT TIME ZONE 'America/Guayaquil')>=6 AND extract(hour FROM salida AT TIME ZONE 'America/Guayaquil')<12
 WHEN 'TARDE' THEN extract(hour FROM salida AT TIME ZONE 'America/Guayaquil')>=12 AND extract(hour FROM salida AT TIME ZONE 'America/Guayaquil')<18
 WHEN 'NOCHE' THEN extract(hour FROM salida AT TIME ZONE 'America/Guayaquil')>=18 ELSE false END)),
 pagina AS(SELECT * FROM filtrados WHERE rn>coalesce((p->>'cursor')::integer,0) ORDER BY rn LIMIT 12)
SELECT jsonb_build_object('data',coalesce((SELECT jsonb_agg(transporte.compra_viaje_datos(id,o,d)||jsonb_build_object('plazas_disponibles',libres,'tarifa_desde_centavos',precio) ORDER BY rn) FROM pagina),'[]'::jsonb),
 'next_cursor',CASE WHEN (SELECT max(rn) FROM filtrados)>(SELECT max(rn) FROM pagina) THEN (SELECT max(rn)::text FROM pagina) ELSE NULL END)
$$;

CREATE FUNCTION transporte.compra_detalle(p_id uuid,p_o integer,p_d integer) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE v transporte.viajes; f transporte.frecuencias; o integer; d integer; datos jsonb;
BEGIN
 SELECT * INTO v FROM transporte.viajes WHERE id=p_id AND estado='PUBLICADO' AND salida>now();
 IF v.id IS NULL THEN RAISE EXCEPTION 'Viaje no disponible' USING ERRCODE='P0002'; END IF;
 SELECT * INTO f FROM transporte.frecuencias WHERE id=v.frecuencia_id;
 IF NOT f.activa OR NOT EXISTS(SELECT 1 FROM transporte.buses WHERE id=v.bus_id AND activo)
 OR NOT EXISTS(SELECT 1 FROM transporte.cooperativas WHERE id=v.cooperativa_id AND activa) THEN RAISE EXCEPTION 'Viaje no disponible' USING ERRCODE='P0002'; END IF;
 SELECT coalesce(p_o,min(orden)),coalesce(p_d,max(orden)) INTO o,d FROM transporte.ruta_paradas WHERE ruta_id=f.ruta_id;
 IF o>=d OR (f.tipo_viaje='DIRECTO' AND(o<>(SELECT min(orden) FROM transporte.ruta_paradas WHERE ruta_id=f.ruta_id) OR d<>(SELECT max(orden) FROM transporte.ruta_paradas WHERE ruta_id=f.ruta_id))) THEN RAISE EXCEPTION 'Tramo no valido'; END IF;
 datos:=transporte.compra_viaje_datos(p_id,o,d);
 IF datos IS NULL THEN RAISE EXCEPTION 'Tramo no valido'; END IF;
 RETURN datos||jsonb_build_object('mapa',transporte.plano_disponible(p_id,o,d),
 'plazas_disponibles',(SELECT count(*) FROM jsonb_array_elements(transporte.plano_disponible(p_id,o,d)->'celdas')c WHERE c->>'tipo'='ASIENTO' AND c->>'estado'='DISPONIBLE'),
 'tarifa_desde_centavos',(SELECT min(precio_centavos) FROM transporte.tarifas WHERE frecuencia_id=f.id AND grupo_id=(SELECT grupo_id FROM transporte.buses WHERE id=v.bus_id) AND origen_orden=o AND destino_orden=d AND activa AND vigencia @> (v.salida AT TIME ZONE 'America/Guayaquil')::date));
END $$;

CREATE FUNCTION transporte.compra_resumen(p_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE r transporte.reservas; v jsonb; q jsonb;
BEGIN
 r:=transporte.reserva_autorizada(p_id); v:=transporte.compra_viaje_datos(r.viaje_id,r.origen_orden,r.destino_orden);
 SELECT to_jsonb(c)-'cooperativa_id'||jsonb_build_object('moneda','USD','expires_at',r.expires_at,
 'impuesto_bp',coalesce((SELECT cl.impuesto_bp FROM transporte.cotizacion_lineas cl WHERE cl.cotizacion_id=c.id LIMIT 1),0),
 'lineas',coalesce((SELECT jsonb_agg(to_jsonb(l)-'cooperativa_id'||jsonb_build_object('asiento_codigo',pc.codigo,'pasajero',p.nombres||' '||p.apellidos,
 'clase',ca.codigo,'beneficio_codigo',be.codigo,'beneficio_nombre',be.nombre,'descuento_bp',be.descuento_bp,
 'subtotal_neto_centavos',l.base_centavos-l.descuento_centavos+l.servicio_centavos,'total_centavos',l.base_centavos-l.descuento_centavos+l.servicio_centavos+l.iva_centavos) ORDER BY pc.piso,pc.fila,pc.columna)
 FROM transporte.cotizacion_lineas l JOIN transporte.reserva_asientos a ON a.id=l.reserva_asiento_id JOIN transporte.plano_celdas pc ON pc.id=a.asiento_id
 JOIN transporte.clases_asiento ca ON ca.id=pc.clase_id JOIN transporte.pasajeros p ON p.reserva_asiento_id=a.id LEFT JOIN transporte.beneficios be ON be.id=l.beneficio_id WHERE l.cotizacion_id=c.id),'[]'::jsonb))
 INTO q FROM transporte.cotizaciones c WHERE c.reserva_id=r.id AND c.version=r.cotizacion_version;
 RETURN jsonb_build_object('reserva_id',r.id,'estado',CASE WHEN r.estado='PENDIENTE' AND r.expires_at<=now() THEN 'VENCIDA' ELSE r.estado END,
 'expires_at',r.expires_at,'cantidad',r.cantidad,'viaje',v-'bus'-'mapa','bus',v->'bus','aceptada_version',r.aceptada_version,'cotizacion',q,
 'contacto',CASE WHEN r.contacto_email IS NULL THEN NULL ELSE jsonb_build_object('email',r.contacto_email,'telefono',r.contacto_telefono) END,
 'asientos',(SELECT coalesce(jsonb_agg(jsonb_build_object('reserva_asiento_id',a.id,'asiento_id',pc.id,'codigo',pc.codigo,'piso',pc.piso,'clase',cl.codigo,
 'tarifa_centavos',coalesce((SELECT min(precio_centavos) FROM transporte.tarifas WHERE frecuencia_id=vi.frecuencia_id AND grupo_id=b.grupo_id AND clase_id=cl.id AND origen_orden=r.origen_orden AND destino_orden=r.destino_orden AND activa AND vigencia @> (vi.salida AT TIME ZONE 'America/Guayaquil')::date),0)) ORDER BY pc.piso,pc.fila,pc.columna),'[]'::jsonb)
 FROM transporte.reserva_asientos a JOIN transporte.plano_celdas pc ON pc.id=a.asiento_id JOIN transporte.clases_asiento cl ON cl.id=pc.clase_id
 JOIN transporte.viajes vi ON vi.id=r.viaje_id JOIN transporte.buses b ON b.id=vi.bus_id WHERE a.reserva_id=r.id),
 'pasajeros',(SELECT coalesce(jsonb_agg(to_jsonb(p)-'cooperativa_id' ORDER BY pc.piso,pc.fila,pc.columna),'[]'::jsonb) FROM transporte.pasajeros p JOIN transporte.reserva_asientos a ON a.id=p.reserva_asiento_id JOIN transporte.plano_celdas pc ON pc.id=a.asiento_id WHERE a.reserva_id=r.id));
END $$;

CREATE FUNCTION transporte.compra_beneficios(p_reserva uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE r transporte.reservas;
BEGIN
 r:=transporte.reserva_autorizada(p_reserva);
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('codigo',be.codigo,'nombre',be.nombre,'activo',be.activo,'descuento_bp',be.descuento_bp,'edad_min',be.edad_min,'edad_max_exclusiva',be.edad_max_exclusiva,'condiciones',be.condiciones,'requiere_respaldo',be.codigo='DISCAPACIDAD'))
 FROM transporte.beneficios be JOIN transporte.viajes v ON v.id=r.viaje_id WHERE be.cooperativa_id=r.cooperativa_id AND be.activo AND be.vigencia @> (v.salida AT TIME ZONE 'America/Guayaquil')::date),'[]'::jsonb);
END $$;

CREATE FUNCTION transporte.compra_guardar_pasajeros(p_reserva uuid,p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE r transporte.reservas; x jsonb;
BEGIN
 r:=transporte.reserva_autorizada(p_reserva); PERFORM 1 FROM transporte.reservas WHERE id=r.id FOR UPDATE;
 r:=transporte.reserva_autorizada(p_reserva);
 IF r.estado<>'PENDIENTE' OR r.expires_at<=now() OR EXISTS(SELECT 1 FROM transporte.intentos_pago WHERE reserva_id=r.id AND estado<>'ANULADO') THEN RAISE EXCEPTION 'Reserva no editable'; END IF;
 IF jsonb_array_length(p->'pasajeros')<>r.cantidad OR(SELECT count(DISTINCT elem->>'reserva_asiento_id') FROM jsonb_array_elements(p->'pasajeros')elem)<>r.cantidad THEN RAISE EXCEPTION 'Complete un pasajero por asiento'; END IF;
 FOR x IN SELECT * FROM jsonb_array_elements(p->'pasajeros') LOOP
  IF NOT EXISTS(SELECT 1 FROM transporte.reserva_asientos WHERE id=(x->>'reserva_asiento_id')::uuid AND reserva_id=r.id) THEN RAISE EXCEPTION 'Asiento ajeno a reserva' USING ERRCODE='42501'; END IF;
  IF length(trim(x->>'nombres')) NOT BETWEEN 1 AND 100 OR length(trim(x->>'apellidos')) NOT BETWEEN 1 AND 100 OR length(trim(x->>'documento')) NOT BETWEEN 1 AND 30 OR x->>'tipo_documento' NOT IN('CEDULA','PASAPORTE','OTRO') THEN RAISE EXCEPTION 'Datos de pasajero invalidos' USING ERRCODE='22023'; END IF;
  IF x->>'respaldo_archivo_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM transporte.archivos WHERE id=(x->>'respaldo_archivo_id')::uuid AND propietario_id=transporte.actor() AND cooperativa_id=r.cooperativa_id AND categoria='RESPALDO' AND validado_servidor) THEN RAISE EXCEPTION 'Archivo no accesible' USING ERRCODE='42501'; END IF;
  PERFORM transporte.guardar_pasajero((x->>'reserva_asiento_id')::uuid,jsonb_build_object('nombres',x->>'nombres','apellidos',x->>'apellidos','tipoDocumento',x->>'tipo_documento','documento',x->>'documento','nacimiento',x->>'nacimiento','beneficio',x->>'beneficio_codigo','respaldoArchivoId',x->>'respaldo_archivo_id'));
  UPDATE transporte.pasajeros SET email=nullif(x->>'email',''),telefono=nullif(x->>'telefono','') WHERE reserva_asiento_id=(x->>'reserva_asiento_id')::uuid;
 END LOOP;
 UPDATE transporte.reservas SET contacto_email=p->'contacto'->>'email',contacto_telefono=p->'contacto'->>'telefono',aceptada_version=NULL WHERE id=r.id;
 RETURN transporte.compra_resumen(r.id)->'pasajeros';
END $$;

REVOKE ALL ON FUNCTION transporte.compra_viaje_datos(uuid,integer,integer),transporte.compra_catalogos(),transporte.compra_buscar(jsonb),transporte.compra_detalle(uuid,integer,integer),transporte.compra_resumen(uuid),transporte.compra_beneficios(uuid),transporte.compra_guardar_pasajeros(uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.compra_catalogos(),transporte.compra_buscar(jsonb),transporte.compra_detalle(uuid,integer,integer),transporte.compra_resumen(uuid),transporte.compra_beneficios(uuid),transporte.compra_guardar_pasajeros(uuid,jsonb) TO transporte_runtime;
COMMIT;

