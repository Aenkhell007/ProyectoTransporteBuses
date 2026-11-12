import { http } from '../../services/http';
import type { BusEditorDatos } from '../../components/flota/EditorBus';
import type { ConfiguracionGlobalDatos } from '../../components/configuracion/EditorConfiguracionGlobal';
import type { IdentidadCooperativaDatos } from '../../components/configuracion/EditorIdentidad';
import type { CompatibilidadGrupos, FrecuenciaCompatible, GrupoCompatible } from '../../components/flota/GruposHabilitadosEditor';
import type { ClaseAsiento } from '../../types/plano';

async function codificar(archivo: File) {
  let blob: Blob = archivo;
  if (archivo.type === 'image/svg+xml') {
    // El editor ya valida el SVG estático. Al servidor solo se envían píxeles.
    const url = URL.createObjectURL(archivo);
    try {
      const img = new Image(); img.src = url; await img.decode();
      const canvas = document.createElement('canvas'); canvas.width = Math.min(img.naturalWidth || 400, 2048); canvas.height = Math.min(img.naturalHeight || 200, 2048);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('No se pudo convertir el logo.')), 'image/png'));
    } finally { URL.revokeObjectURL(url); }
  }
  return new Promise<{ base64: string }>((resolve, reject) => {
    const r = new FileReader(); r.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    r.onload = () => resolve({ base64: String(r.result).split(',')[1] }); r.readAsDataURL(blob);
  });
}
const guardar = <T,>(ruta: string, datos: unknown) => http<T>(`/mikel/${ruta}`, { method: 'PUT', body: JSON.stringify(datos) });
export interface CatalogosEditor {
  buses: { id: string; unidad: string; placa: string; activo: boolean }[];
  grupos: { id: string; nombre: string }[];
  clases: ClaseAsiento[];
  servicios: { id: string; nombre: string }[];
}
export const editorApi = {
  catalogos: () => http<CatalogosEditor>('/mikel/buses'),
  bus: (id: string) => http<BusEditorDatos>(`/mikel/buses/${encodeURIComponent(id)}`),
  guardarBus: async (datos: BusEditorDatos, fotos: File[], crearVersion: boolean) => guardar<BusEditorDatos>('buses', { datos, fotos: await Promise.all(fotos.map(codificar)), crearVersion }),
  identidad: () => http<IdentidadCooperativaDatos>('/mikel/identidad'),
  guardarIdentidad: async (datos: IdentidadCooperativaDatos, logo: File | null) => guardar<IdentidadCooperativaDatos>('identidad', { datos, logo: logo ? await codificar(logo) : null }),
  global: () => http<{ datos: ConfiguracionGlobalDatos; canales: { correo: boolean; whatsapp: boolean }; admiteMfa: boolean }>('/mikel/global'),
  guardarGlobal: (datos: ConfiguracionGlobalDatos) => guardar<ConfiguracionGlobalDatos>('global', datos),
  compatibilidades: () => http<{ grupos: GrupoCompatible[]; frecuencias: (FrecuenciaCompatible & { version: number })[] }>('/mikel/compatibilidades'),
  guardarCompatibilidades: (datos: CompatibilidadGrupos) => guardar<CompatibilidadGrupos>('compatibilidades', datos),
};
