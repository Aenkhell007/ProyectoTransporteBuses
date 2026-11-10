import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { connectionOptions } from './config-db.js';

// Solo consulta metadatos: nunca instala, aplica migraciones ni carga datos.
async function main() {
  const directorio = new URL('../prisma/migrations/', import.meta.url);
  const locales = readdirSync(directorio, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
  const pool = new Pool(connectionOptions(process.env.DIRECT_URL ? 'DIRECT_URL' : 'DATABASE_URL'));
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN READ ONLY');
      const tabla = await client.query("SELECT to_regclass('transporte._prisma_migrations') IS NOT NULL AS existe");
      if (!tabla.rows[0].existe) throw new Error('Sin registro de migraciones');
      const registros = await client.query<{ migration_name: string; checksum: string; aplicada: boolean; revertida: boolean }>(
        'SELECT migration_name, checksum, finished_at IS NOT NULL AS aplicada, rolled_back_at IS NOT NULL AS revertida FROM transporte._prisma_migrations',
      );
      const aplicadas = registros.rows.filter(row => row.aplicada && !row.revertida);
      const pendientes = locales.filter(nombre => !aplicadas.some(row => row.migration_name === nombre));
      const fallidas = registros.rows.filter(row => !row.aplicada && !row.revertida).map(row => row.migration_name);
      const desconocidas = aplicadas.filter(row => !locales.includes(row.migration_name)).map(row => row.migration_name);
      const diferentes = locales.filter(nombre => {
        const registro = aplicadas.find(row => row.migration_name === nombre);
        if (!registro) return false;
        const sql = readFileSync(new URL(`${nombre}/migration.sql`, directorio), 'utf8');
        // Prisma admite diferencias de final de línea entre Windows y Linux.
        return ![sql, sql.replace(/\r\n/g, '\n'), sql.replace(/\r?\n/g, '\r\n')]
          .some(texto => createHash('sha256').update(texto).digest('hex') === registro.checksum);
      });
      const tablaVenta = await client.query("SELECT to_regclass('transporte.ventas_oficina_peticiones') IS NOT NULL AS existe");
      console.log(JSON.stringify({ locales: locales.length, pendientes, fallidas, desconocidas, diferentes, ventaOficinaIdempotente: tablaVenta.rows[0].existe }, null, 2));
      if (pendientes.length || fallidas.length || desconocidas.length || diferentes.length || !tablaVenta.rows[0].existe) process.exitCode = 1;
      await client.query('ROLLBACK');
    } finally { client.release(); }
  } finally { await pool.end(); }
}

main().catch(() => {
  console.error('No se pudo comprobar el registro de migraciones. Revisa la conexión TLS y los permisos de lectura; DIRECT_URL es solo para el responsable de migraciones. No se modificó la base.');
  process.exitCode = 1;
});
