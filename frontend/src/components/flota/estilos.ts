// Clases de Tailwind del módulo de flota, alineadas con las del módulo de compra
// (botones, tarjetas y foco). Se escriben completas para que Tailwind las detecte.

export const tarjeta =
  'mx-auto my-6 max-w-4xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm';
export const titulo = 'text-xl font-bold text-slate-900';
export const subtitulo = 'mt-6 mb-2 text-lg font-bold text-slate-900';

export const etiquetaCampo = 'flex flex-col gap-1 text-sm font-semibold text-slate-800';
export const entrada =
  'min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 aria-[invalid=true]:border-red-600';
export const textoError = 'text-xs font-normal text-red-700';

export const botonPrimario =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-red-600 bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60';
export const botonSecundario =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60';
export const botonAlerta =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60';

export const tabla = 'w-full border-collapse text-left text-sm';
export const encabezadoTabla = 'border-b border-slate-300 px-2 py-2 font-semibold text-slate-700';
export const celdaTabla = 'border-b border-slate-200 px-2 py-2 text-slate-800';

export const insigniaActiva =
  'inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800';
export const insigniaInactiva =
  'inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700';