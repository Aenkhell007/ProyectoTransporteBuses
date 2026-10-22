// Ayudas para los servicios simulados mientras no exista el servidor Express.
// Se eliminan cuando cada servicio use el cliente http() real.

export function esperar(ms = 450): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Copia profunda para que la pantalla no modifique los datos simulados. */
export function copiar<T>(valor: T): T {
  return structuredClone(valor);
}
