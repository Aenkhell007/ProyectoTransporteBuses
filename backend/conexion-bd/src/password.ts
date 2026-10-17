import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
export function hashPassword(password: string): string {
  if (password.length < 8 || Buffer.byteLength(password) > 1024) throw new Error("Contraseña fuera de los límites admitidos");
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex");
  return `scrypt-v1$16384$8$1$${salt}$${hash}`;
}
export function verifyPassword(password: string, encoded: string): boolean {
  const [alg,n,r,p,salt,hash] = encoded.split("$");
  if (alg!=="scrypt-v1" || n!=="16384" || r!=="8" || p!=="1" || !salt || !/^[0-9a-f]{128}$/.test(hash??"") || Buffer.byteLength(password)>1024) return false;
  const actual = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(actual, Buffer.from(hash,"hex"));
}
