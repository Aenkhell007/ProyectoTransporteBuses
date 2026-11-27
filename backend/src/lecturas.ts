import type { PoolClient, QueryResultRow } from 'pg';

type Lectura = { sql: string; valores?: unknown[] };

/** Agrupa SELECT independientes en una consulta bajo el contexto RLS actual.
 * Recibe SQL estático del servidor y mantiene los valores parametrizados.
 * No abre otras conexiones ni usa caché o SECURITY DEFINER.
 */
export async function consultarLote(db: Pick<PoolClient, 'query'>, lecturas: Lectura[]): Promise<QueryResultRow[][]> {
  if (!lecturas.length) return [];
  const valores: unknown[] = [];
  const partes = lecturas.map(({ sql, valores: parametros = [] }, i) => {
    const desplazamiento = valores.length;
    const consulta = sql.replace(/\$(\d+)/g, (_, n: string) => '$' + (Number(n) + desplazamiento));
    valores.push(...parametros);
    return 'COALESCE((SELECT jsonb_agg(to_jsonb(q' + i + ')) FROM (' + consulta + ') q' + i + "), '[]'::jsonb)";
  });
  const resultado = await db.query('SELECT jsonb_build_array(' + partes.join(',') + ') AS lecturas', valores);
  return resultado.rows[0].lecturas;
}
