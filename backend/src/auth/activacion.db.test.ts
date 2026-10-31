import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID,randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { Pool } from "pg";

test("activación real en PostgreSQL: bloqueo, expiración, uso único y bienvenida única; revierte todos los datos", {skip:process.env.PROBAR_ACTIVACION_DB!=="1"},async()=>{
  config({path:resolve(__dirname,"../../.env"),quiet:true});
  const carpeta=resolve(__dirname,"../../conexion-bd");
  config({path:resolve(carpeta,".env"),quiet:true});
  assert.ok(process.env.DIRECT_URL,"Falta conexión de migraciones para esta prueba explícita");
  const url=new URL(process.env.DIRECT_URL);
  for(const k of ["sslmode","sslcert","sslrootcert","sslkey","sslidentity","sslaccept","schema"]) url.searchParams.delete(k);
  const ca=process.env.DB_SSL_CA_FILE;
  const pool=new Pool({connectionString:url.toString(),ssl:{rejectUnauthorized:true,...(ca?{ca:readFileSync(resolve(carpeta,ca),"utf8")}:{})},connectionTimeoutMillis:10000});
  const db=await pool.connect();
  try {
    await db.query("BEGIN");
    async function rechaza(sql:string,params:unknown[],code:string){
      await db.query("SAVEPOINT caso_invalido");
      try {await assert.rejects(db.query(sql,params),{code});}
      finally {await db.query("ROLLBACK TO SAVEPOINT caso_invalido");}
    }
    const marca=randomUUID();
    const email=`activacion-${marca}@example.com`;
    const usuario=await db.query("SELECT transporte.registrar_cliente($1,$2,$3,$4,$5,$6,$7,$8) AS id",["Prueba","Activacion","OTRO",marca.slice(0,30),email,"+593991234567","scrypt-v1$hash-exclusivo-de-prueba-no-utilizable","PRUEBA_AUTOMATIZADA"]);
    const uid=usuario.rows[0].id;
    assert.equal((await db.query("SELECT transporte.email_activado($1) AS activo",[uid])).rows[0].activo,false);
    await rechaza("SELECT transporte.emitir_sesion_autenticada($1,$2,now()+interval '1 hour')",[uid,randomBytes(32).toString("hex")],"PAV02");
    const uno=randomBytes(32).toString("hex");
    assert.equal((await db.query("SELECT * FROM transporte.solicitar_activacion($1,$2)",[email,uno])).rowCount,1);
    assert.equal((await db.query("SELECT * FROM transporte.solicitar_activacion($1,$2)",[email,randomBytes(32).toString("hex")])).rowCount,0,"limita reenvíos consecutivos");
    assert.equal((await db.query("SELECT * FROM transporte.solicitar_activacion($1,$2)",[`ausente-${marca}@example.com`,randomBytes(32).toString("hex")])).rowCount,0);
    await rechaza("SELECT transporte.confirmar_activacion($1)",[randomBytes(32).toString("hex")],"PAV01");
    await db.query("UPDATE transporte.tokens_identidad SET expires_at=now()-interval '1 second' WHERE token_hash=$1",[uno]);
    await rechaza("SELECT transporte.confirmar_activacion($1)",[uno],"PAV01");
    await db.query("UPDATE transporte.tokens_identidad SET created_at=now()-interval '2 minutes' WHERE token_hash=$1",[uno]);
    const dos=randomBytes(32).toString("hex");
    assert.equal((await db.query("SELECT * FROM transporte.solicitar_activacion($1,$2)",[email,dos])).rowCount,1);
    assert.equal((await db.query("SELECT transporte.confirmar_activacion($1) AS id",[dos])).rows[0].id,uid);
    assert.equal((await db.query("SELECT transporte.email_activado($1) AS activo",[uid])).rows[0].activo,true);
    await rechaza("SELECT transporte.confirmar_activacion($1)",[dos],"PAV01");
    assert.equal((await db.query("SELECT count(*)::int AS n FROM transporte.notificaciones WHERE usuario_id=$1 AND tipo='BIENVENIDA_VERIFICADA'",[uid])).rows[0].n,1);
    const aviso=await db.query("SELECT * FROM transporte.reclamar_bienvenida($1)",[uid]);
    assert.equal(aviso.rowCount,1);
    assert.equal((await db.query("SELECT * FROM transporte.reclamar_bienvenida($1)",[uid])).rowCount,0,"no permite reclamar dos veces el envío");
    // Simula únicamente el registro de aceptación, sin contactar al proveedor.
    await db.query("SELECT transporte.finalizar_bienvenida($1,true,'prueba-sin-envio',NULL)",[aviso.rows[0].notificacion_id]);
    assert.equal((await db.query("SELECT * FROM transporte.reclamar_bienvenida($1)",[uid])).rowCount,0);
    const sesion=randomBytes(32).toString("hex");
    await db.query("SELECT transporte.emitir_sesion_autenticada($1,$2,now()+interval '1 hour')",[uid,sesion]);
    assert.equal((await db.query("SELECT transporte.abrir_contexto($1) AS id",[sesion])).rows[0].id,uid);
  } finally {await db.query("ROLLBACK");db.release();await pool.end();}
});
