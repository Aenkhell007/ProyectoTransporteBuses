import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "./generated/prisma/client.js";
import { createHash, randomUUID } from "node:crypto";
import { connectionOptions } from "./config-db.js";

export const prisma = new PrismaClient({ adapter: new PrismaPg(connectionOptions(), { schema: "transporte" }) });

// El token procede de una cookie segura verificada, nunca de un usuarioId del body.
// SET LOCAL y la consulta ocurren en LA MISMA transacción/conexión del pool.
export async function conSesion<T>(tokenSesion: string, trabajo: (tx: Prisma.TransactionClient) => Promise<T>) {
  const hash = createHash("sha256").update(tokenSesion).digest("hex");
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT transporte.abrir_contexto(${hash}::text, ${randomUUID()}::text)`;
    return trabajo(tx);
  }, { maxWait: 5000, timeout: 10000 });
}

export function aNumeroSeguro(centavos: bigint): number {
  const numero = Number(centavos);
  if (!Number.isSafeInteger(numero)) throw new Error("Importe fuera de precisión segura");
  return numero;
}
