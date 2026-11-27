import { existsSync } from "node:fs";
import { mkdir, writeFile, readFile, unlink, rmdir } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { nombreSeguro, ErrorPago } from "./validacion";

// Directorio privado: nunca se publica mediante express.static (funciona desde src y dist).
export const directorioPrivado = resolve(
  process.env.PAGOS_ARCHIVOS_DIR ??
    (existsSync(resolve(__dirname, "../../.data"))
      ? resolve(__dirname, "../../.data/pagos")
      : existsSync(resolve(__dirname, "../../../../.data"))
        ? resolve(__dirname, "../../../../.data/pagos")
        : resolve(process.cwd(), ".data/pagos")),
);
export function rutaArchivo(clave: string) {
  const ruta = resolve(directorioPrivado, clave);
  if (!ruta.startsWith(directorioPrivado + sep))
    throw new ErrorPago(404, "Archivo no disponible.");
  return ruta;
}
export async function guardarArchivo(
  db: PoolClient,
  reservaId: string,
  datos: Buffer,
  nombre: string,
  mime: string,
  categoria: "COMPROBANTE" | "DOCUMENTO" | "RESPALDO" | "REEMBOLSO",
  creados: string[],
) {
  const id = randomUUID();
  const clave = `${id}/${nombreSeguro(nombre)}`;
  const ruta = rutaArchivo(clave);
  await mkdir(resolve(ruta, ".."), { recursive: true, mode: 0o700 });
  await writeFile(ruta, datos, { flag: "wx", mode: 0o600 });
  creados.push(clave);
  const hash = createHash("sha256").update(datos).digest("hex");
  const insertado = await db.query(
    `INSERT INTO transporte.archivos(id,propietario_id,cooperativa_id,categoria,ruta_privada,mime,bytes,sha256,validado_servidor)
    SELECT $1,transporte.actor(),r.cooperativa_id,$2,$3,$4,$5,$6,true FROM transporte.reservas r WHERE r.id=$7`,
    [id, categoria, clave, mime, datos.length, hash, reservaId],
  );
  if (insertado.rowCount !== 1) {
    throw new ErrorPago(404, "Reserva no disponible para registrar el archivo.");
  }
  return id;
}
export async function borrarCreados(claves: string[]) {
  await Promise.all(
    claves.map(async (clave) => {
      const ruta = rutaArchivo(clave);
      await unlink(ruta).catch(() => {});
      await rmdir(resolve(ruta, "..")).catch(() => {});
    }),
  );
}
export async function leerArchivo(clave: string) {
  try {
    return await readFile(rutaArchivo(clave));
  } catch {
    throw new ErrorPago(
      404,
      "El archivo no está disponible en este servidor. Contacta a la cooperativa.",
    );
  }
}
