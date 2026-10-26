import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pool } from "./database";
import { authRouter } from "./auth/router";
import { correoConfigurado } from "./auth/brevo";
const app = express();
const port = Number(process.env.PORT ?? 3000);
app.disable("x-powered-by");
app.use(cors({origin:[process.env.FRONTEND_URL ?? "http://127.0.0.1:5173","http://localhost:5173"],credentials:true}));
app.use(express.json({limit:"16kb"}));
app.use(cookieParser());
app.use("/api/auth",authRouter);
app.get("/api/health",async (_req,res)=>{
  try { const r=await pool.query("SELECT current_user AS rol,version FROM transporte.schema_version");res.json({api:"ok",baseDatos:"conectada",esquema:r.rows[0],autenticacion:"sesion-cookie",correo:correoConfigurado() ? "configurado" : "pendiente"}); }
  catch {res.status(503).json({api:"ok",baseDatos:"no disponible"});}
});
app.use((_req,res)=>{res.status(404).json({error:"Ruta no encontrada."});});
app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
  const status=error && typeof error === "object" && "status" in error ? Number(error.status) : 500;
  res.status(status===413?413:status===400?400:500).json({error:status===413?"Solicitud demasiado grande.":status===400?"JSON no válido.":"No se pudo procesar la solicitud."});
});
const server=app.listen(port,"127.0.0.1",()=>console.log(`API disponible en http://127.0.0.1:${port}`));
server.on("error",()=>{console.error("No se pudo abrir el puerto del backend. Comprueba si ya está en uso.");process.exitCode=1;void pool.end();});
