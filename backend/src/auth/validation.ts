export class DatosInvalidos extends Error {}

function texto(valor: unknown, nombre: string, maximo: number): string {
  if (typeof valor !== "string" || !valor.trim() || valor.trim().length > maximo) {
    throw new DatosInvalidos(`${nombre}: revisa el valor ingresado.`);
  }
  return valor.trim();
}

export function leerCredenciales(body: unknown) {
  if (!body || typeof body !== "object") throw new DatosInvalidos("Completa los datos de acceso.");
  const datos = body as Record<string, unknown>;
  const email = texto(datos.email, "Correo", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DatosInvalidos("Ingresa un correo válido.");
  if (typeof datos.password !== "string" || !datos.password.length || datos.password.length > 128) {
    throw new DatosInvalidos("Ingresa una contraseña de hasta 128 caracteres.");
  }
  return { email, password: datos.password };
}

export function cedulaValida(cedula: string): boolean {
  if (!/^\d{10}$/.test(cedula)) return false;
  const provincia = Number(cedula.slice(0, 2));
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30) || Number(cedula[2]) > 5) return false;
  const suma = [...cedula.slice(0, 9)].reduce((total, digito, indice) => {
    const valor = Number(digito) * (indice % 2 === 0 ? 2 : 1);
    return total + (valor > 9 ? valor - 9 : valor);
  }, 0);
  return (10 - suma % 10) % 10 === Number(cedula[9]);
}

export function leerRegistro(body: unknown) {
  const credenciales = leerCredenciales(body);
  const datos = body as Record<string, unknown>;
  if (credenciales.password.length < 8) throw new DatosInvalidos("La contraseña debe tener al menos 8 caracteres.");
  const nombres = texto(datos.nombres, "Nombres", 100);
  const apellidos = texto(datos.apellidos, "Apellidos", 100);
  const tipoDocumento = texto(datos.tipoDocumento, "Tipo de documento", 20);
  const documento = texto(datos.documento, "Documento", 30);
  if (!["CEDULA", "PASAPORTE", "OTRO"].includes(tipoDocumento)) throw new DatosInvalidos("Selecciona un tipo de documento válido.");
  if (tipoDocumento === "CEDULA" && !cedulaValida(documento)) throw new DatosInvalidos("La cédula no supera la validación de formato y dígito de control.");
  if (datos.aceptaTerminos !== true) throw new DatosInvalidos("Confirma las condiciones de la prueba académica.");
  const telefono = datos.telefono == null ? null : texto(datos.telefono, "Teléfono", 20);
  if (telefono !== null && !/^\+5939\d{8}$/.test(telefono)) throw new DatosInvalidos("Ingresa un celular ecuatoriano válido, sin el cero inicial.");
  return { ...credenciales, nombres, apellidos, tipoDocumento, documento, telefono };
}
