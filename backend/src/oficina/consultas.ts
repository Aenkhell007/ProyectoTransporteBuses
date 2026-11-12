import type { PoolClient } from 'pg';
import { ErrorOficina } from './acceso';

// NULL no equivale a todas las oficinas: una reserva web solo es visible a un
// miembro con ámbito completo o a quien tenga el permiso global.
export const alcanceReserva = (permiso = 'cooperativa.leer') => `transporte.puede('${permiso}',r.cooperativa_id,r.oficina_id) AND
 (r.oficina_id IS NOT NULL OR transporte.puede('${permiso}') OR EXISTS (
 SELECT 1 FROM transporte.membresias m WHERE m.usuario_id=transporte.actor() AND m.activa
 AND m.cooperativa_id=r.cooperativa_id AND m.oficina_id IS NULL))`;

export async function accesoOficina(db: PoolClient) {
  const oficinas = (await db.query(`SELECT o.id,o.nombre,o.cooperativa_id,c.nombre AS cooperativa
    FROM transporte.oficinas o JOIN transporte.cooperativas c ON c.id=o.cooperativa_id
    WHERE o.activa AND c.activa AND transporte.puede('oficina.vender',c.id,o.id) ORDER BY c.nombre,o.nombre`)).rows;
  if (!oficinas.length && !(await db.query(`SELECT EXISTS(SELECT 1 FROM transporte.membresias m WHERE m.usuario_id=transporte.actor() AND m.activa AND transporte.puede('cooperativa.leer',m.cooperativa_id,m.oficina_id)) OR transporte.puede('cooperativa.leer') AS permitido`)).rows[0]?.permitido)
    throw new ErrorOficina(403, 'No tienes un ámbito de oficina autorizado.');
  return oficinas;
}

export async function listarReservas(db: PoolClient, historial = false) {
  await accesoOficina(db);
  return (await db.query(`SELECT r.id,r.cooperativa_id,r.oficina_id,r.viaje_id,r.estado,
    CASE WHEN r.estado='PENDIENTE' AND r.expires_at<=now() THEN 'VENCIDA' ELSE r.estado END AS estado_actual,
    r.created_at,r.expires_at,r.total_centavos,r.cantidad,v.salida,
    co.nombre AS cooperativa,u.nombres || ' ' || u.apellidos AS cliente,
    coalesce(r.contacto_email,u.email) AS email,coalesce(r.contacto_telefono,u.telefono) AS telefono,
    c.id AS compra_id,c.codigo AS compra_codigo,p.monto_centavos AS pagado_centavos,p.confirmado_at,
    cp.id AS comprobante_id,cp.estado AS comprobante_estado,cp.version AS comprobante_version,
    cp.motivo,cp.referencia,cp.created_at AS recibido,cp.archivo_id,a.mime,a.bytes,
    i.total_centavos AS reportado_centavos,i.cuenta_snapshot,
    (SELECT string_agg(pc.codigo,', ' ORDER BY pc.piso,pc.fila,pc.columna) FROM transporte.reserva_asientos ra JOIN transporte.plano_celdas pc ON pc.id=ra.asiento_id WHERE ra.reserva_id=r.id AND ra.estado<>'LIBERADO') AS asientos,
    origen.nombre || ' → ' || destino.nombre AS ruta
    FROM transporte.reservas r JOIN transporte.viajes v ON v.id=r.viaje_id
    JOIN transporte.frecuencias f ON f.id=v.frecuencia_id
    JOIN transporte.ruta_paradas po ON po.ruta_id=f.ruta_id AND po.orden=r.origen_orden
    JOIN transporte.ruta_paradas pd ON pd.ruta_id=f.ruta_id AND pd.orden=r.destino_orden
    JOIN transporte.terminales tor ON tor.id=po.terminal_id JOIN transporte.ciudades origen ON origen.id=tor.ciudad_id
    JOIN transporte.terminales tde ON tde.id=pd.terminal_id JOIN transporte.ciudades destino ON destino.id=tde.ciudad_id
    JOIN transporte.usuarios u ON u.id=r.cliente_id JOIN transporte.cooperativas co ON co.id=r.cooperativa_id
    LEFT JOIN transporte.compras c ON c.reserva_id=r.id LEFT JOIN transporte.pagos p ON p.reserva_id=r.id
    LEFT JOIN LATERAL (SELECT * FROM transporte.intentos_pago x WHERE x.reserva_id=r.id ORDER BY x.created_at DESC ${historial ? '' : 'LIMIT 1'}) i ON true
    LEFT JOIN transporte.comprobantes cp ON cp.intento_id=i.id LEFT JOIN transporte.archivos a ON a.id=cp.archivo_id
    WHERE ${alcanceReserva()} ORDER BY r.created_at DESC`)).rows;
}
