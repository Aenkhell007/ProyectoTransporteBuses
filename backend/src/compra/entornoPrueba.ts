// compra.test.ts importa router.ts, y router.ts importa database.ts, que exige DATABASE_URL al cargarse.
// El pool de pg no conecta hasta la primera consulta y estas pruebas no consultan la base, así que en un
// clon sin .env basta una URL local que nunca se usa. Si la variable ya existe, no se toca.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://prueba:prueba@127.0.0.1:1/prueba";
  process.env.DB_SSL = "false";
}

export {};
