import {iniciarEntregas} from './pagos/entregaBoletos';
import {reembolsosClienteRouter} from './pagos/reembolsosCliente';
import {operacionRouter} from './operacion/router';
import { identidadRouter } from './identidad/router';
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pool } from "./database";
import { compraRouter } from "./compra/router";
import { authRouter } from "./auth/router";
import { correoConfigurado } from "./auth/brevo";
import { payphoneConfigurado } from "./pagos/payphone";
import { origenPermitido } from "./origen";
import { iniciarBienvenidas } from "./auth/activacion";
import { pagosRouter } from "./pagos/router";
import flotaRouter from "./flota/compatibilidadRouter";
import { editorRouter } from "./flota/editorRouter";
import { adminResumenRouter } from './oficina/admin';
import { oficinaRouter } from './oficina/router';
import { configuracionPagosRouter } from './pagos/configuracionRouter';
import { abordajeRouter } from './abordaje/router';
import { publicoRouter } from './rutas';
import { configuracionWallet } from './pagos/googleWallet';

const app = express();
const port = Number(process.env.PORT ?? 3000);
app.disable("x-powered-by");
app.set("trust proxy", "loopback");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  next();
});
app.use(cors({origin:(origin,cb)=>cb(null,!origin||origenPermitido(origin)),credentials:true}));
app.use(cookieParser());
app.use('/api/publico', publicoRouter);
app.use('/api/mikel', editorRouter);
app.use('/api/identidad', identidadRouter);
app.use('/api/operacion', operacionRouter);
app.use('/api/abordaje', abordajeRouter);
app.use('/api/reservas', reembolsosClienteRouter);
app.use('/api/configuracion/pagos', configuracionPagosRouter);
app.use(express.json({limit:"16kb"}));
app.use("/api/auth",authRouter);
app.use('/api', adminResumenRouter);
app.use('/api', oficinaRouter);
app.use("/api",compraRouter);
app.use("/api", pagosRouter);
app.use("/api", flotaRouter);
// Estado mínimo: no expone rol, versión del esquema ni datos internos.
app.get("/api/health",async (_req,res)=>{
  try {
    await pool.query("SELECT 1");
    res.json({api:"ok",baseDatos:"conectada",correo:correoConfigurado() ? "configurado" : "pendiente",payphone:payphoneConfigurado() ? "configurado" : "pendiente",googleWallet:configuracionWallet() ? "configurado" : "demo"});
  }
  catch {res.status(503).json({api:"ok",baseDatos:"no disponible"});}
});
app.use((_req,res)=>{res.status(404).json({error:"Ruta no encontrada."});});
app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
  const status=error && typeof error === "object" && "status" in error ? Number(error.status) : 500;
  if (status !== 413 && status !== 400) console.error("Error no controlado en API:", error instanceof Error ? error.message : "Error desconocido");
  res.status(status===413?413:status===400?400:500).json({error:status===413?"Solicitud demasiado grande.":status===400?"JSON no válido.":"No se pudo procesar la solicitud."});
});

// Mantenimiento periódico: vence reservas pendientes (respetando comprobantes en revisión) y purga sesiones/tokens antiguos.
const MANTENIMIENTO_MS = Math.max(60_000, Number(process.env.MANTENIMIENTO_MS ?? 5 * 60_000) || 5 * 60_000);
let mantenimiento: NodeJS.Timeout | undefined;
async function mantener() {
  try { await pool.query("SELECT transporte.mantener_expiraciones_y_sesiones()"); }
  catch { console.error("No se pudo ejecutar el mantenimiento periódico de reservas y sesiones."); }
}

// El catálogo de Ecuador ya no se sincroniza en cada arranque: se carga explícitamente con `npm run seed:ecuador`.
const server=app.listen(port,process.env.HOST ?? "127.0.0.1",()=>{
  console.log(`API disponible en http://${process.env.HOST ?? "127.0.0.1"}:${port}`);
  void pool.query("SELECT 1").catch(()=>console.error("No se pudo preparar la conexión inicial a la base de datos."));
  iniciarBienvenidas();
  iniciarEntregas();
  mantenimiento = setInterval(()=>void mantener(), MANTENIMIENTO_MS);
  mantenimiento.unref();
  setTimeout(()=>void mantener(), 15_000).unref();
});
server.on("error",()=>{console.error("No se pudo abrir el puerto del backend. Comprueba si ya está en uso.");process.exitCode=1;void pool.end();});

let cerrando = false;
function apagar(senal: string) {
  if (cerrando) return;
  cerrando = true;
  console.log(`Señal ${senal} recibida: cerrando el backend de forma ordenada.`);
  if (mantenimiento) clearInterval(mantenimiento);
  setTimeout(()=>process.exit(0), 10_000).unref();
  server.close(()=>{ void pool.end().finally(()=>process.exit(0)); });
}
process.on("SIGTERM", ()=>apagar("SIGTERM"));
process.on("SIGINT", ()=>apagar("SIGINT"));
