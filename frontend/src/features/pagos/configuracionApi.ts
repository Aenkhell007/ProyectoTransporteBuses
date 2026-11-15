import { http } from '../../services/http';
import type { DatosCuentaBancaria } from '../../components/configuracion/FormularioCuentaBancaria';

export type CuentaConfigurada = DatosCuentaBancaria & {
  id: string; version?: number; bancoId?: string; qrId?: string | null; qrSrc?: string; quitarQr?: boolean;
};
export type MetodoConfigurado = {
  codigo: string; nombre: string; descripcion: string; habilitado: boolean; disponible: boolean; instrucciones: string; estado?: string;
};
export type ConfiguracionPagos = {
  cooperativa: { id: string; nombre: string }; version: number; cuentas: CuentaConfigurada[]; metodos: MetodoConfigurado[];
  formatos: string[]; maximoMB: number; referenciaObligatoria: boolean;
  bancos: Array<{ id: string; nombre: string }>; limites: { formatos: string[]; maximoMB: number };
};
const base = '/configuracion/pagos';
function normalizar(datos: ConfiguracionPagos) {
  return { ...datos, cuentas: datos.cuentas.map(c => ({ ...c, qr: null })) };
}
async function archivoBase64(file: File) {
  if (file.size > 5 * 1048576 || !['image/png', 'image/jpeg'].includes(file.type)) throw new Error('QR: usa una imagen JPG o PNG de hasta 5 MB.');
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('No se pudo leer la imagen QR.'));
    reader.readAsDataURL(file);
  });
}
export const configuracionPagosApi = {
  cooperativas: () => http<{ cooperativas: Array<{ id: string; nombre: string }> }>(`${base}/cooperativas`),
  consultar: async (coop: string) => normalizar(await http<ConfiguracionPagos>(`${base}/${encodeURIComponent(coop)}`)),
  guardar: async (datos: ConfiguracionPagos) => {
    const cuentas = await Promise.all(datos.cuentas.map(async c => ({ id: c.id, version: c.version, bancoId: c.bancoId, banco: c.banco, tipo: c.tipo, numero: c.numero,
      titular: c.titular, ruc: c.ruc, alias: c.alias, moneda: c.moneda, activa: c.activa, predeterminada: c.predeterminada, quitarQr: c.quitarQr === true,
      ...(c.qr ? { qrBase64: await archivoBase64(c.qr) } : {}) })));
    return normalizar(await http<ConfiguracionPagos>(`${base}/${encodeURIComponent(datos.cooperativa.id)}`, { method: 'PUT', body: JSON.stringify({ version: datos.version, cuentas,
      metodos: datos.metodos.map(m => ({ codigo: m.codigo, habilitado: m.habilitado, instrucciones: m.instrucciones })), formatos: datos.formatos, maximoMB: datos.maximoMB, referenciaObligatoria: datos.referenciaObligatoria }) }));
  },
};
