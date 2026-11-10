BEGIN;

-- Lectura limitada a una reserva autorizada. No expone secretos de proveedores.
CREATE FUNCTION transporte.consultar_pago_cliente(p_reserva uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE r transporte.reservas; resultado jsonb;
BEGIN
 r:=transporte.reserva_autorizada(p_reserva);
 SELECT jsonb_build_object(
  'reserva',jsonb_build_object('id',r.id,'estado',r.estado,'expires_at',r.expires_at,'cantidad',r.cantidad,
    'total_centavos',r.total_centavos,'cotizacion_version',r.cotizacion_version,'aceptada_version',r.aceptada_version),
  'viaje',(SELECT jsonb_build_object('salida',v.salida+(po.minutos_desde_origen*interval '1 minute'),
    'llegada',v.salida+(pd.minutos_desde_origen*interval '1 minute'),'origen',co.nombre,'destino',cd.nombre,
    'terminalOrigen',tor.nombre,'terminalDestino',tde.nombre,'cooperativa',c.nombre,'unidad',b.unidad,
    'placa',b.placa,'chasis',b.chasis,'carroceria',b.carroceria,'servicio',g.nombre,'pisos',pl.pisos)
    FROM transporte.viajes v JOIN transporte.frecuencias f ON f.id=v.frecuencia_id
    JOIN transporte.ruta_paradas po ON po.ruta_id=f.ruta_id AND po.orden=r.origen_orden
    JOIN transporte.ruta_paradas pd ON pd.ruta_id=f.ruta_id AND pd.orden=r.destino_orden
    JOIN transporte.terminales tor ON tor.id=po.terminal_id JOIN transporte.ciudades co ON co.id=tor.ciudad_id
    JOIN transporte.terminales tde ON tde.id=pd.terminal_id JOIN transporte.ciudades cd ON cd.id=tde.ciudad_id
    JOIN transporte.cooperativas c ON c.id=v.cooperativa_id JOIN transporte.buses b ON b.id=v.bus_id
    JOIN transporte.grupos_bus g ON g.id=b.grupo_id JOIN transporte.planos pl ON pl.id=v.plano_id WHERE v.id=r.viaje_id),
  'cotizacion',(SELECT to_jsonb(q)-'cooperativa_id' FROM transporte.cotizaciones q
    WHERE q.reserva_id=r.id AND q.version=coalesce(r.aceptada_version,r.cotizacion_version)),
  'pasajeros',coalesce((SELECT jsonb_agg(jsonb_build_object('nombre',p.nombres||' '||p.apellidos,
    'documento',p.documento,'categoria',coalesce(be.nombre,'Adulto'),'asiento',pc.codigo,'piso',pc.piso,
    'tarifaCentavos',cl.base_centavos,'descuentoCentavos',cl.descuento_centavos,'servicioCentavos',cl.servicio_centavos,
    'ivaCentavos',cl.iva_centavos,'impuestoBp',cl.impuesto_bp) ORDER BY pc.piso,pc.fila,pc.columna)
    FROM transporte.reserva_asientos a JOIN transporte.plano_celdas pc ON pc.id=a.asiento_id
    JOIN transporte.pasajeros p ON p.reserva_asiento_id=a.id
    LEFT JOIN transporte.cotizaciones q ON q.reserva_id=r.id AND q.version=coalesce(r.aceptada_version,r.cotizacion_version)
    LEFT JOIN transporte.cotizacion_lineas cl ON cl.cotizacion_id=q.id AND cl.reserva_asiento_id=a.id
    LEFT JOIN transporte.beneficios be ON be.id=cl.beneficio_id WHERE a.reserva_id=r.id),'[]'::jsonb),
  'cuentas',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'banco',b.nombre,'tipo',a.tipo,'numero',a.numero,
    'titular',a.titular,'ruc',a.documento_titular,'qrArchivoId',a.qr_archivo_id) ORDER BY b.nombre,a.id)
    FROM transporte.cuentas_bancarias a JOIN transporte.bancos b ON b.id=a.banco_id
    WHERE a.cooperativa_id=r.cooperativa_id AND a.activa AND b.activo),'[]'::jsonb),
  'metodos',coalesce((SELECT jsonb_agg(jsonb_build_object('id',m.codigo,'nombre',m.nombre,'tipo',m.tipo,
    'habilitado',cfg.habilitado AND m.adaptador_disponible AND m.codigo='BANCO','instrucciones',cfg.instrucciones)
    ORDER BY m.nombre) FROM transporte.cooperativa_metodos_pago cfg JOIN transporte.metodos_pago m ON m.id=cfg.metodo_id
    WHERE cfg.cooperativa_id=r.cooperativa_id),'[]'::jsonb),
  'politica',(SELECT jsonb_build_object('maxBytes',p.max_bytes,'mimes',p.mimes,'referenciaObligatoria',p.referencia_obligatoria)
    FROM transporte.politica_comprobantes p WHERE p.cooperativa_id=r.cooperativa_id),
  'intento',(SELECT jsonb_build_object('id',i.id,'estado',i.estado,'cuentaId',i.cuenta_id,'cuentaSnapshot',i.cuenta_snapshot,
    'metodo',m.nombre,'totalCentavos',i.total_centavos) FROM transporte.intentos_pago i JOIN transporte.metodos_pago m ON m.id=i.metodo_id
    WHERE i.reserva_id=r.id ORDER BY (i.estado IN('PENDIENTE','EN_REVISION','APROBADO')) DESC,i.created_at DESC,i.id DESC LIMIT 1),
  'comprobante',(SELECT jsonb_build_object('id',c.id,'estado',c.estado,'motivo',c.motivo,'referencia',c.referencia,
    'archivoId',a.id,'bytes',a.bytes,'mime',a.mime,'nombre',regexp_replace(a.ruta_privada,'^.*/',''),'version',c.version)
    FROM transporte.comprobantes c JOIN transporte.intentos_pago i ON i.id=c.intento_id JOIN transporte.archivos a ON a.id=c.archivo_id
    WHERE i.reserva_id=r.id ORDER BY (i.estado IN('PENDIENTE','EN_REVISION','APROBADO')) DESC,i.created_at DESC,i.id DESC LIMIT 1),
  'compra',(SELECT jsonb_build_object('id',c.id,'codigo',c.codigo,'estado',c.estado,'totalPagadoCentavos',c.total_pagado_centavos,
    'viajeSnapshot',c.viaje_snapshot) FROM transporte.compras c WHERE c.reserva_id=r.id),
  'documento',(SELECT jsonb_build_object('id',b.id,'qrId',b.qr_id,'estado',b.estado,'archivoId',b.archivo_id)
    FROM transporte.boletos b JOIN transporte.compras c ON c.id=b.compra_id WHERE c.reserva_id=r.id)
 ) INTO resultado;
 RETURN resultado;
END $$;
REVOKE ALL ON FUNCTION transporte.consultar_pago_cliente(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.consultar_pago_cliente(uuid) TO transporte_runtime;

CREATE FUNCTION transporte.archivo_pago_autorizado(p_reserva uuid,p_archivo uuid) RETURNS transporte.archivos
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=transporte,pg_catalog AS $$
DECLARE r transporte.reservas; a transporte.archivos;
BEGIN
 r:=transporte.reserva_autorizada(p_reserva);
 IF NOT EXISTS(SELECT 1 FROM transporte.comprobantes c JOIN transporte.intentos_pago i ON i.id=c.intento_id
     WHERE i.reserva_id=r.id AND c.archivo_id=p_archivo)
 AND NOT EXISTS(SELECT 1 FROM transporte.boletos b JOIN transporte.compras c ON c.id=b.compra_id
     WHERE c.reserva_id=r.id AND c.estado='CONFIRMADA' AND b.estado='LISTO' AND b.archivo_id=p_archivo)
 AND NOT EXISTS(SELECT 1 FROM transporte.cuentas_bancarias cb
     WHERE cb.cooperativa_id=r.cooperativa_id AND cb.activa AND cb.qr_archivo_id=p_archivo)
 THEN RAISE EXCEPTION 'Archivo no accesible' USING ERRCODE='42501'; END IF;
 SELECT * INTO a FROM transporte.archivos WHERE id=p_archivo AND validado_servidor;
 RETURN a;
END $$;
REVOKE ALL ON FUNCTION transporte.archivo_pago_autorizado(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transporte.archivo_pago_autorizado(uuid,uuid) TO transporte_runtime;
COMMIT;
