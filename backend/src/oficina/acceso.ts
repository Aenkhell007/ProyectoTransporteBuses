import type { Request } from "express";
import type { PoolClient } from "pg";
import { conSesion } from "../sesion";

export class ErrorOficina extends Error {
  constructor(
    public status: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}
export function sesionOficina<T>(
  req: Request,
  trabajo: (db: PoolClient) => Promise<T>,
) {
  const token = req.cookies?.transporte_sesion;
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new ErrorOficina(401, "Inicia sesión para continuar.");
  return conSesion(token, trabajo);
}
export async function exigirPermiso(db: PoolClient, permiso: string) {
  if (
    !(await db.query("SELECT transporte.puede($1) AS permitido", [permiso]))
      .rows[0]?.permitido
  )
    throw new ErrorOficina(403, "No tienes permiso para consultar este panel.");
}
export function fechaConsulta(valor: unknown, defecto: string) {
  if (valor === undefined) return defecto;
  if (
    typeof valor !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(valor) ||
    Number.isNaN(Date.parse(valor)) ||
    new Date(valor).toISOString().slice(0, 10) !== valor
  )
    throw new ErrorOficina(422, "Selecciona una fecha válida.");
  return valor;
}
