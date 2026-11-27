// Datos académicos persistidos en PostgreSQL; nunca son una salida comercial.
// Ejecutar desde la raíz: node backend/scripts/crear-viajes-8-noviembre.cjs --crear
// Inserta dos viajes independientes e idempotentes para el 8 de noviembre de 2026.
const { config } = require('dotenv');
const { Pool } = require('pg');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '..');
config({ path: resolve(root, '.env'), quiet: true });
config({ path: resolve(root, 'conexion-bd/.env'), quiet: true });

async function crear(tipo) {
  const normal = tipo === "NORMAL";
  const sufijo = normal ? "NORMAL" : "VIP";
  const ruc = normal ? 'PRUEBA-081126-N' : 'PRUEBA-081126-V';
  const frecuenciaCodigo = `ACADEMICO-08-${sufijo}`;
  const capacidad = normal ? 40 : 36;
  const hora = normal ? "08:00" : "06:00";
  if (!process.argv.includes('--crear')) throw new Error('Usa --crear para insertar explícitamente el viaje académico.');
  if (!process.env.DIRECT_URL) throw new Error('Falta DIRECT_URL en la configuración privada del backend.');
  const url = new URL(process.env.DIRECT_URL);
  for (const k of ['sslmode','sslcert','sslrootcert','sslkey','sslidentity','sslaccept','schema']) url.searchParams.delete(k);
  const ca = process.env.DB_SSL_CA_FILE;
  const pool = new Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: true, ...(ca ? { ca: readFileSync(resolve(root, 'conexion-bd', ca), 'utf8') } : {}) }, connectionTimeoutMillis: 10000 });
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[ruc]);
    await db.query("SELECT set_config('app.request_id','seed-viaje-academico-20261105',true)");
    const existente = await db.query("SELECT v.id,v.plano_id,v.salida FROM transporte.viajes v JOIN transporte.frecuencias f ON f.id=v.frecuencia_id JOIN transporte.cooperativas c ON c.id=v.cooperativa_id WHERE c.ruc=$1 AND f.codigo=$2 ORDER BY v.salida DESC LIMIT 1",[ruc,frecuenciaCodigo]);
    if (existente.rowCount) {
      await db.query('COMMIT');
      console.log('El viaje ya existe; no se modificó ni duplicó:', JSON.stringify(existente.rows[0]));
      return;
    }
    const ciudades = (await db.query("SELECT id,nombre FROM transporte.ciudades WHERE activa AND nombre IN ('Quito','Guayaquil')")).rows;
    const origen = ciudades.find(c => c.nombre === 'Quito')?.id;
    const destino = ciudades.find(c => c.nombre === 'Guayaquil')?.id;
    if (!origen || !destino) throw new Error('Deben existir Quito y Guayaquil en el catálogo.');
    const catalogo = async (tabla, codigo) => {
      const r = await db.query(`SELECT id FROM transporte.${tabla} WHERE codigo=$1`, [codigo]);
      if (!r.rowCount) throw new Error(`Falta catálogo ${tabla}: ${codigo}`);
      return r.rows[0].id;
    };
    const clase = await catalogo('clases_asiento',sufijo);
    const impuesto = await catalogo('impuestos','IVA0_TRANSPORTE');
    const banco = await catalogo('bancos','PICHINCHA');
    const insertar = async (tabla, columnas, valores) => (await db.query(`INSERT INTO transporte.${tabla}(${columnas}) VALUES(${valores.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING id`, valores)).rows[0].id;
    const coop = await insertar('cooperativas','nombre,razon_social,ruc', [`PRUEBA ACADÉMICA ${sufijo} · Gran Continental`,'Datos académicos; no presta servicio comercial',ruc]);
    const terminal = async (ciudad, nombre) => (await db.query('INSERT INTO transporte.terminales(ciudad_id,nombre) VALUES($1,$2) ON CONFLICT(ciudad_id,nombre) DO NOTHING RETURNING id',[ciudad,nombre])).rows[0]?.id ?? (await db.query('SELECT id FROM transporte.terminales WHERE ciudad_id=$1 AND nombre=$2',[ciudad,nombre])).rows[0].id;
    const t1 = await terminal(origen,'Terminal de prueba Quito');
    const t2 = await terminal(destino,'Terminal de prueba Guayaquil');
    const ruta = await insertar('rutas','cooperativa_id,nombre',[coop,'PRUEBA · Quito – Guayaquil']);
    for (const [t,orden,minutos] of [[t1,1,0],[t2,2,510]]) await insertar('ruta_paradas','cooperativa_id,ruta_id,terminal_id,orden,minutos_desde_origen',[coop,ruta,t,orden,minutos]);
    const grupo = await insertar('grupos_bus','cooperativa_id,nombre,descripcion',[coop,normal ? 'Confort (Un piso)' : 'Ejecutivo (Dos pisos)','Bus académico para comprobar el flujo de compra.']);
    const frecuencia = await insertar('frecuencias','cooperativa_id,ruta_id,codigo,hora_salida,resolucion_ant,tipo_viaje',[coop,ruta,frecuenciaCodigo,hora,'PRUEBA ACADÉMICA; SIN AUTORIZACIÓN COMERCIAL','DIRECTO']);
    await insertar('frecuencia_grupo','cooperativa_id,frecuencia_id,grupo_id',[coop,frecuencia,grupo]);
    const bus = await insertar('buses','cooperativa_id,grupo_id,unidad,placa,chasis,carroceria',[coop,grupo,`PRUEBA-08-${sufijo}`,`PRUEBA-08-${sufijo}`,'Scania (prueba)',normal ? 'Marcopolo Paradiso 1200 (prueba)' : 'Marcopolo Paradiso 1800 DD (prueba)']);
    const plano = await insertar('planos','cooperativa_id,bus_id,numero_version,nombre,pisos',[coop,bus,1,`Plano académico ${sufijo}`,normal ? 1 : 2]);
    for (let piso=1; piso<=(normal ? 1 : 2); piso++) for(let fila=1; fila<=(normal ? 10 : 6); fila++) {
      const posiciones = normal ? [[1,'A'],[2,'B'],[4,'C'],[5,'D']] : [[1,1],[3,2],[4,3]];
      for (const [columna,offset] of posiciones) {
        const codigo = normal ? `${fila}${offset}` : `${piso===1?'L':'U'}${(fila-1)*3+offset}`;
        await insertar('plano_celdas','cooperativa_id,plano_id,piso,fila,columna,tipo,codigo,clase_id',[coop,plano,piso,fila,columna,'ASIENTO',codigo,clase]);
      }
      await insertar('plano_celdas','cooperativa_id,plano_id,piso,fila,columna,tipo',[coop,plano,piso,fila,normal ? 3 : 2,'PASILLO']);
    }
    await db.query('UPDATE transporte.planos SET publicado=true WHERE id=$1',[plano]);
    await insertar('tarifas','cooperativa_id,frecuencia_id,grupo_id,clase_id,origen_orden,destino_orden,precio_centavos,impuesto_id,vigencia',[coop,frecuencia,grupo,clase,1,2,normal ? 2000 : 2800,impuesto,'[2026-11-08,)']);
    const salida = (await db.query("SELECT (date '2026-11-08' + $1::time) AT TIME ZONE 'America/Guayaquil' AS salida",[hora])).rows[0].salida;
    const viaje = await insertar('viajes','cooperativa_id,frecuencia_id,bus_id,plano_id,salida,llegada,liberacion_bus,estado',[coop,frecuencia,bus,plano,salida,new Date(+salida+510*60000),new Date(+salida+570*60000),'PUBLICADO']);
    // Cuenta imposible de transferir: habilita el recorrido académico de las vistas 6/7.
    await insertar('cuentas_bancarias','cooperativa_id,banco_id,tipo,numero,titular,documento_titular,alias,activa',[coop,banco,'CORRIENTE','PRUEBA-NO-TRANSFERIR','SOLO PRUEBA ACADÉMICA; NO REALIZAR PAGOS','PRUEBA-SIN-RUC','Cuenta académica sin valor bancario',true]);
    await db.query("INSERT INTO transporte.cooperativa_metodos_pago(cooperativa_id,metodo_id,habilitado,instrucciones) SELECT $1,id,true,'Prueba académica. No realices transferencias. Adjunta únicamente un archivo de prueba.' FROM transporte.metodos_pago WHERE codigo='BANCO'",[coop]);
    await insertar('politica_comprobantes','cooperativa_id,referencia_obligatoria',[coop,false]);
    const fecha = salida.toISOString().slice(0,10);
    const consulta = {origen,destino,fecha,cantidad:1};
    const visibles = (await db.query('SELECT transporte.compra_buscar($1::jsonb) datos',[JSON.stringify(consulta)])).rows[0].datos.data;
    if (!visibles.some(v=>v.viaje_id===viaje)) throw new Error('El viaje no quedó visible en la búsqueda; se revierte la inserción.');
    const detalle = (await db.query('SELECT transporte.compra_detalle($1,1,2) datos',[viaje])).rows[0].datos;
    if(detalle.plazas_disponibles!==capacidad) throw new Error('La disponibilidad no coincide con la capacidad configurada; se revierte.');
    await db.query('COMMIT');
    console.log(JSON.stringify({tipo:sufijo,viaje,plano,fecha,salida:hora,asientos:capacidad,tarifaUSD:normal ? 20 : 28,
      link:`http://127.0.0.1:5173/asientos?${new URLSearchParams({viaje_id:viaje,origen_orden:'1',destino_orden:'2',cantidad:'2',plano_id:plano})}`,
      busqueda:`http://127.0.0.1:5173/viajes?${new URLSearchParams(consulta)}`},null,2));
  } catch(e) {await db.query('ROLLBACK'); throw e;} finally {db.release(); await pool.end();}
}
async function main() { for (const tipo of ['NORMAL','VIP']) await crear(tipo); }
main().catch(e=>{console.error('No se creó el viaje:',e.message);process.exitCode=1;});
