import { Router } from 'express';
import { sesionOficina, exigirPermiso, fechaConsulta, ErrorOficina } from './acceso';

export const adminResumenRouter = Router();
adminResumenRouter.get('/admin/resumen', async (req, res, next) => {
  try {
    const hasta = fechaConsulta(req.query.hasta, new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' }));
    const desde = fechaConsulta(req.query.desde, new Date(Date.parse(hasta) - 6*86400000).toISOString().slice(0,10));
    if (desde > hasta || Date.parse(hasta)-Date.parse(desde) > 365*86400000) throw new ErrorOficina(422, 'El intervalo debe estar entre uno y 366 días.');
    const datos = await sesionOficina(req, async db => {
      await exigirPermiso(db, 'identidad.admin');
      const kpis = (await db.query(`SELECT
        (SELECT count(*)::int FROM transporte.cooperativas WHERE activa) AS "cooperativasActivas",
        (SELECT count(*)::int FROM transporte.usuarios) AS "usuariosRegistrados",
        (SELECT count(DISTINCT m.usuario_id)::int FROM transporte.membresias m JOIN transporte.roles r ON r.id=m.rol_id WHERE m.activa AND r.codigo='OFICINISTA') AS oficinistas,
        (SELECT count(*)::int FROM transporte.buses) AS "busesRegistrados"`)).rows[0];
      const cooperativas = (await db.query(`SELECT c.id,c.nombre,CASE WHEN c.activa THEN 'Activa' ELSE 'Inactiva' END AS estado,
        (SELECT string_agg(DISTINCT u.nombres || ' ' || u.apellidos,', ') FROM transporte.membresias m JOIN transporte.usuarios u ON u.id=m.usuario_id JOIN transporte.roles ro ON ro.id=m.rol_id WHERE m.cooperativa_id=c.id AND m.activa AND ro.codigo='COOPERATIVA') AS responsable,
        (SELECT count(*)::int FROM transporte.buses b WHERE b.cooperativa_id=c.id) AS buses
        FROM transporte.cooperativas c ORDER BY c.nombre`)).rows.map(r => ({...r,responsable:r.responsable ?? 'Sin responsable asignado'}));
      const usuariosPorRol = (await db.query(`WITH asignaciones AS (
        SELECT u.id,coalesce(r.nombre,'Cliente') AS rol FROM transporte.usuarios u
        LEFT JOIN transporte.usuario_roles_globales g ON g.usuario_id=u.id LEFT JOIN transporte.roles r ON r.id=g.rol_id
        UNION SELECT m.usuario_id,r.nombre FROM transporte.membresias m JOIN transporte.roles r ON r.id=m.rol_id WHERE m.activa
      ) SELECT rol,count(DISTINCT id)::int AS cantidad FROM asignaciones GROUP BY rol ORDER BY rol`)).rows;
      const tendenciaUsuarios = (await db.query(`SELECT to_char(d,'YYYY-MM-DD') AS fecha,count(u.id)::int AS registros
        FROM generate_series($1::date,$2::date,'1 day') d LEFT JOIN transporte.usuarios u
        ON (u.created_at AT TIME ZONE 'America/Guayaquil')::date=d::date GROUP BY d ORDER BY d`,[desde,hasta])).rows;
      return {kpis,cooperativas,usuariosPorRol,tendenciaUsuarios};
    });
    res.set('Cache-Control','no-store').json(datos);
  } catch(e) { next(e); }
});
adminResumenRouter.use((e: unknown, _req: unknown, res: import('express').Response, _next: unknown) => {
  const status = e instanceof ErrorOficina ? e.status : (e as {code?:string})?.code === '28000' ? 401 : 503;
  res.status(status).json({error:e instanceof ErrorOficina ? e.message : 'No se pudo consultar el panel. Inténtalo nuevamente.'});
});
