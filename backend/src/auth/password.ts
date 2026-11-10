import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

function derivar(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, hash) => {
      if (error) reject(error); else resolve(hash);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return `scrypt-v1$16384$8$1$${salt}$${(await derivar(password, salt)).toString("hex")}`;
}

// Se usa también ante correos inexistentes para efectuar la misma derivación.
export const HASH_SIN_USUARIO = `scrypt-v1$16384$8$1$${"0".repeat(32)}$${"0".repeat(128)}`;

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const partes = encoded.split("$");
  const [algoritmo, n, r, p, salt, hash] = partes;
  if (partes.length !== 6 || algoritmo !== "scrypt-v1" || n !== "16384" || r !== "8" || p !== "1" ||
      !/^[0-9a-f]{32}$/.test(salt ?? "") || !/^[0-9a-f]{128}$/.test(hash ?? "")) return false;
  const actual = await derivar(password, salt);
  return timingSafeEqual(actual, Buffer.from(hash, "hex"));
}
