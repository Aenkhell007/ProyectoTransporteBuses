export const PROVINCIAS_ECUADOR = [
  'Azuay',
  'Bolívar',
  'Cañar',
  'Carchi',
  'Chimborazo',
  'Cotopaxi',
  'El Oro',
  'Esmeraldas',
  'Galápagos',
  'Guayas',
  'Imbabura',
  'Loja',
  'Los Ríos',
  'Manabí',
  'Morona Santiago',
  'Napo',
  'Orellana',
  'Pastaza',
  'Pichincha',
  'Santa Elena',
  'Santo Domingo de los Tsáchilas',
  'Sucumbíos',
  'Tungurahua',
  'Zamora Chinchipe',
] as const;

export type AmbitoOperacion = 'INTERPROVINCIAL' | 'URBANA' | 'RURAL';

export const AMBITOS_OPERACION: ReadonlyArray<{
  codigo: AmbitoOperacion;
  etiqueta: string;
  descripcion: string;
}> = [
  {
    codigo: 'INTERPROVINCIAL',
    etiqueta: 'Interprovincial',
    descripcion: 'Rutas nacionales entre terminales terrestres de distintas provincias.',
  },
  {
    codigo: 'URBANA',
    etiqueta: 'Urbana',
    descripcion: 'Rutas dentro de una provincia usando paraderos, barrios, sectores y mercados.',
  },
  {
    codigo: 'RURAL',
    etiqueta: 'Rural / Parroquial',
    descripcion: 'Rutas cantonales y parroquiales dentro de la provincia asignada.',
  },
];

export const TIPOS_PUNTO_REFERENCIA = [
  { codigo: 'PARADERO', etiqueta: 'Paradero principal' },
  { codigo: 'BARRIO', etiqueta: 'Barrio' },
  { codigo: 'PARROQUIA', etiqueta: 'Parroquia' },
  { codigo: 'MERCADO', etiqueta: 'Mercado / Plaza' },
  { codigo: 'SECTOR', etiqueta: 'Sector / Avenida' },
  { codigo: 'REFERENCIA', etiqueta: 'Punto de referencia' },
  { codigo: 'TERMINAL', etiqueta: 'Terminal local' },
] as const;

export type TipoPuntoReferencia = (typeof TIPOS_PUNTO_REFERENCIA)[number]['codigo'];

export function etiquetaAmbitoOperacion(ambito?: string | null, provincia?: string | null): string {
  const norm = (ambito ?? 'INTERPROVINCIAL').toUpperCase();
  if (norm === 'URBANA') return provincia ? `Urbana · ${provincia}` : 'Urbana';
  if (norm === 'RURAL') return provincia ? `Rural · ${provincia}` : 'Rural';
  return 'Interprovincial';
}

export function etiquetaTipoPunto(tipo?: string | null): string {
  const encontrado = TIPOS_PUNTO_REFERENCIA.find((t) => t.codigo === (tipo ?? '').toUpperCase());
  return encontrado?.etiqueta ?? 'Terminal';
}
