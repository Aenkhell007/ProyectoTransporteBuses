const lecturas = new Map<string, Promise<unknown>>();

export function compartirLectura<T>(clave: string, solicitar: () => Promise<T>): Promise<T> {
  const existente = lecturas.get(clave);
  if (existente) return existente as Promise<T>;

  const pendiente = solicitar().finally(() => {
    if (lecturas.get(clave) === pendiente) lecturas.delete(clave);
  });
  lecturas.set(clave, pendiente);
  return pendiente;
}

export function descartarLecturasPendientes() {
  lecturas.clear();
}
