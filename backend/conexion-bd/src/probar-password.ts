import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "./password.js";
const example = "Clave-sintetica-de-prueba-2026";
const first = hashPassword(example);
assert(verifyPassword(example, first));
assert(!verifyPassword("otra-contraseña", first));
assert(!verifyPassword(example, "hash-invalido"));
assert.notEqual(first, hashPassword(example));
console.log("Hash y verificación scrypt correctos; salts distintos.");
