import type { TipoPuntoReferencia } from './ecuador';

const PARROQUIAS_POR_CANTON: Record<string, readonly string[]> = {
  ambato: [
    'Santa Rosa',
    'Atahualpa',
    'Izamba',
    'Huachi Grande',
    'Huachi Chico',
    'Huachi Loreto',
    'Picaihua',
    'Totoras',
    'Montalvo',
    'La Matriz',
    'Atocha - Ficoa',
    'Celiano Monge',
    'La Merced',
    'La Península',
    'Pishilata',
    'San Francisco',
    'Pinllo',
    'Ambatillo',
    'Augusto N. Martínez',
    'Constantino Fernández',
    'Cunchibamba',
    'Juan Benigno Vela',
    'Pasa',
    'Pilahuín',
    'Quisapincha',
    'San Fernando',
    'Unamuncho',
  ],
  'banos de agua santa': ['Baños (Cabecera Cantonal)', 'Lligua', 'Río Negro', 'Río Verde', 'Ulba'],
  banos: ['Baños (Cabecera Cantonal)', 'Lligua', 'Río Negro', 'Río Verde', 'Ulba'],
  cevallos: ['Cevallos (Matriz)', 'Andignato', 'Santo Domingo', 'La Libertad'],
  mocha: ['Mocha (Matriz)', 'Pinguilí'],
  patate: ['Patate (Matriz)', 'El Triunfo', 'Los Andes', 'Sucre'],
  quero: ['Quero (Matriz)', 'Rumipamba', 'Yanayacu - Mochapata'],
  'san pedro de pelileo': [
    'Pelileo (Matriz)',
    'Pelileo Grande',
    'Benítez',
    'Bolívar',
    'Cotaló',
    'Chiquicha',
    'El Rosario',
    'García Moreno',
    'Guambaló',
    'Salasaca',
  ],
  pelileo: [
    'Pelileo (Matriz)',
    'Pelileo Grande',
    'Benítez',
    'Bolívar',
    'Cotaló',
    'Chiquicha',
    'El Rosario',
    'García Moreno',
    'Guambaló',
    'Salasaca',
  ],
  'santiago de pillaro': [
    'Píllaro (Matriz)',
    'Ciudad Nueva',
    'Baquerizo Moreno',
    'Emilio María Terán',
    'Marcos Espinel',
    'Presidente Urbina',
    'San Andrés',
    'San José de Poaló',
    'San Miguelito',
  ],
  pillaro: [
    'Píllaro (Matriz)',
    'Ciudad Nueva',
    'Baquerizo Moreno',
    'Emilio María Terán',
    'Marcos Espinel',
    'Presidente Urbina',
    'San Andrés',
    'San José de Poaló',
    'San Miguelito',
  ],
  tisaleo: ['Tisaleo (Matriz)', 'Quinchicoto'],
  quito: [
    'Centro Histórico',
    'Iñaquito',
    'La Mariscal',
    'La Magdalena',
    'Chillogallo',
    'Quitumbe',
    'Guamaní',
    'Solanda',
    'Calderón',
    'Carcelén',
    'Conocoto',
    'Cumbayá',
    'Tumbaco',
    'Pomasqui',
    'San Antonio de Pichincha',
    'Amaguaña',
    'Alangasí',
    'Yaruquí',
  ],
  ruminahui: ['Sangolquí', 'San Rafael', 'San Pedro de Taboada', 'Cotogchoa', 'Rumipamba'],
  mejia: ['Machachi', 'Alóag', 'Aloasí', 'Cutuglagua', 'Tambillo', 'Uyumbicho'],
  cayambe: ['Cayambe (Matriz)', 'Juan Montalvo', 'Ayora', 'Cangahua', 'Cusubamba', 'Otón'],
  guayaquil: [
    'Tarqui',
    'Ximena',
    'Febres Cordero',
    'Letamendi',
    'Carbo (Concepción)',
    'Rocafuerte',
    'Sucre',
    'Urdaneta',
    'Pascuales',
    'Chongón',
    'Posorja',
  ],
  duran: ['Eloy Alfaro (Durán)', 'El Recreo', 'Divino Niño'],
  daule: ['Daule (Matriz)', 'La Aurora', 'Banife', 'Emiliano Caicedo Marcos', 'Los Lojas'],
  samborondon: ['Samborondón (Matriz)', 'La Puntilla', 'Tarifa'],
  cuenca: [
    'El Sagrario',
    'El Vecino',
    'Totoracocha',
    'Yanuncay',
    'Monay',
    'San Sebastián',
    'Baños',
    'Ricaurte',
    'Sayausí',
    'El Valle',
    'Sinincay',
  ],
  riobamba: [
    'Maldonado',
    'Velasco',
    'Veloz',
    'Lizarzaburu',
    'Yaruquíes',
    'Licán',
    'San Luis',
    'Calpi',
    'Punín',
    'Químiag',
    'Flores',
  ],
  latacunga: [
    'La Matriz',
    'Eloy Alfaro (San Felipe)',
    'Ignacio Flores (La Laguna)',
    'Juan Montalvo',
    'San Buenaventura',
    'Aláquez',
    'Belisario Quevedo',
    'Guaytacama',
    'Mulaló',
    'Poaló',
    'Tanicuchí',
  ],
  salcedo: ['San Miguel (Salcedo)', 'Antonio José Holguín', 'Cusubamba', 'Mulalillo', 'Mulliquindil'],
  ibarra: ['El Sagrario', 'San Francisco', 'Caranqui', 'Alpachaca', 'Priorato', 'La Esperanza', 'San Antonio de Ibarra'],
  otavalo: ['Otavalo (Matriz)', 'San Luis', 'El Jordán', 'San Pablo del Lago', 'González Suárez', 'Ilumán'],
  'santo domingo': [
    'Santo Domingo (Matriz)',
    'Bombolí',
    'Chigüilpe',
    'Río Verde',
    'Río Toachi',
    'Abraham Calazacón',
    'Zaracay',
    'Alluriquín',
    'Luz de América',
    'Puerto Limón',
    'San Jacinto del Búa',
  ],
  manta: ['Manta (Matriz)', 'Tarqui', 'Los Esteros', 'Eloy Alfaro', 'San Mateo', 'San Lorenzo'],
  portoviejo: [
    'Portoviejo (Matriz)',
    '12 de Marzo',
    '18 de Octubre',
    'Andrés de Vera',
    'Colón',
    'Picoazá',
    'Crucita',
    'Calderón',
    'Riochico',
  ],
  machala: ['Machala (Matriz)', 'Puerto Bolívar', 'Jubones', 'La Providencia', '9 de Mayo', 'El Cambio'],
  loja: ['El Sagrario', 'San Sebastián', 'Sucre', 'El Valle', 'Punzara', 'Carigán', 'Vilcabamba', 'Malacatos'],
  esmeraldas: ['Esmeraldas (Matriz)', '5 de Agosto', 'Bartolomé Ruiz', 'Luis Tello', 'Simón Plata Torres', 'Tachina', 'Vuelta Larga'],
  babahoyo: ['Clemente Baquerizo', 'Camilo Ponce', 'Barreiro', 'El Salto', 'Caracol', 'Febres Cordero'],
  quevedo: ['Quevedo (Matriz)', 'San Camilo', 'San Cristóbal', 'Venus del Río Quevedo', 'Guayacán', '7 de Octubre', 'San Carlos'],
  milagro: ['Milagro (Matriz)', 'Chobo', 'Mariscal Sucre', 'Roberto Astudillo'],
  tulcan: ['Tulcán (Matriz)', 'González Suárez', 'Julio Andrade', 'Tufiño', 'Urbina'],
  tena: ['Tena (Matriz)', 'Ahuano', 'Chontapunta', 'Muyuna', 'Pano', 'Puerto Misahuallí', 'Puerto Napo'],
  puyo: ['Puyo (Matriz)', 'Fátima', 'Mera', 'Pomona', 'Tarqui', 'Veracruz'],
  macas: ['Macas (Matriz)', 'Alshi', 'General Proaño', 'Río Blanco', 'Sevilla Don Bosco'],
  azogues: ['Azogues (Matriz)', 'Aurelio Bayas', 'Borrero', 'Cojitambo', 'Guapán', 'Javier Loyola', 'San Marcos'],
  guaranda: ['Ángel Polibio Cháves', 'Gabriel Ignacio Veintimilla', 'Guanujo', 'Salinas', 'Simiátug'],
  salinas: ['Salinas (Matriz)', 'José Luis Tamayo (Muey)', 'Anconcito', 'Santa Rosa'],
  'santa elena': ['Santa Elena (Matriz)', 'Ballenita', 'Ancón', 'Atahualpa', 'Chanduy', 'Colonche', 'Manglaralto'],
};

const LUGARES_POR_PARROQUIA: Record<string, readonly string[]> = {
  'santa rosa': [
    'Parque Central de Santa Rosa',
    'Gasolinera de Santa Rosa',
    'Iglesia de Santa Rosa',
    'Mercado de Santa Rosa',
    'Y de Santa Rosa (Vía a Guaranda)',
    'Unidad Educativa Santa Rosa',
    'Subcentro de Salud de Santa Rosa',
    'Entrada a Miñarica / Santa Rosa',
  ],
  atahualpa: [
    'Parque Central de Atahualpa',
    'Iglesia de Atahualpa',
    'Gasolinera de Atahualpa',
    'Mercado de Atahualpa',
    'Parada Macasto / Atahualpa',
    'Entrada a Atahualpa',
  ],
  izamba: [
    'Parque Central de Izamba',
    'Iglesia de Izamba',
    'Parque Industrial Ambato (Izamba)',
    'Gasolinera de Izamba',
    'Redondel de Izamba / Paso Lateral',
    'Mercado de Izamba',
    'Unidad Educativa Izamba',
  ],
  'huachi grande': [
    'Terminal Terrestre Sur (Huachi Grande)',
    'Parque de Huachi Grande',
    'Gasolinera de Huachi Grande',
    'Iglesia de Huachi Grande',
    'Universidad Técnica de Ambato (Campus Huachi)',
    'Sector San Alfonso / Huachi Grande',
  ],
  'huachi chico': [
    'Redondel de Huachi Chico',
    'Mercado América',
    'Parque de Huachi Chico',
    'Gasolinera Huachi Chico',
    'Unidad Educativa Bolívar (Huachi)',
  ],
  'huachi loreto': [
    'Mall de los Andes',
    'Redondel de los Atis',
    'Hospital Regional Docente Ambato',
    'Estadio Bellavista',
    'Parque Troya',
  ],
  'la matriz': [
    'Parque Montalvo',
    'Parque Cevallos',
    'Mercado Central',
    'Mercado Modelo',
    'Iglesia La Catedral',
    'Municipio Centro',
  ],
  'atocha - ficoa': [
    'Parque El Sueño',
    'Paseo Shopping Ambato',
    'Redondel de Ficoa',
    'Jardín Botánico Atocha - La Liria',
    'Quinta de Juan León Mera',
  ],
  'san francisco': [
    'Terminal Terrestre de Ingahurco',
    'UTA Campus Ingahurco',
    'Plaza Urbina',
    'Hospital Municipal Nuestra Señora de la Merced',
  ],
  pishilata: [
    'Mercado Mayorista de Ambato',
    'Redondel de Terremoto',
    'Ciudadela España',
    'Sector La Joya',
  ],
  picaihua: [
    'Parque Central de Picaihua',
    'Iglesia de Picaihua',
    'Gasolinera de Picaihua',
    'Mercado de Calzado de Picaihua',
    'Entrada a Picaihua',
  ],
  totoras: [
    'Parque Central de Totoras',
    'Iglesia de Totoras',
    'Redondel de Totoras / Paso Lateral',
    'Gasolinera de Totoras',
  ],
  montalvo: [
    'Parque Central de Montalvo',
    'Iglesia de Montalvo',
    'Quinta de Montalvo',
    'Entrada a Montalvo (Panamericana Sur)',
  ],
  pinllo: [
    'Parque Central de Pinllo',
    'Mirador de Pinllo',
    'Iglesia de Pinllo',
    'Parque Provincial de la Familia',
  ],
  quisapincha: [
    'Parque Central de Quisapincha',
    'Iglesia de Quisapincha',
    'Feria del Cuero de Quisapincha',
    'Gasolinera Vía a Quisapincha',
  ],
  salasaca: [
    'Parque Central de Salasaca',
    'Plaza Artesanal de Salasaca',
    'Iglesia de Salasaca',
    'Entrada a Salasaca (Vía Baños)',
  ],
  banos: [
    'Terminal Terrestre de Baños',
    'Parque Central / Basílica de Baños',
    'Mercado Central de Baños',
    'Sector El Salado / Piscinas',
  ],
  pelileo: [
    'Terminal Terrestre de Pelileo',
    'Parque Central de Pelileo',
    'Sector El Tambo / Feria del Jean',
    'Mercado de Pelileo',
  ],
  pillaro: [
    'Terminal Terrestre de Píllaro',
    'Parque Central de Píllaro',
    'Mercado San Juan de Píllaro',
    'Gasolinera Entrada a Píllaro',
  ],
  quitumbe: [
    'Terminal Terrestre Quitumbe',
    'Quicentro Sur',
    'Parque Las Cuadras',
    'Plataforma Gubernamental Sur',
  ],
  calderon: [
    'Parque Central de Calderón',
    'Hospital Docente de Calderón',
    'Gasolinera de Carapungo',
    'Mercado de Calderón',
  ],
  cumbaya: [
    'Parque Central de Cumbayá',
    'Universidad San Francisco de Quito',
    'Paseo San Francisco',
    'Hospital de los Valles',
  ],
  tarqui: [
    'Terminal Terrestre de Guayaquil',
    'Mall del Sol',
    'Parque Samanes',
    'Gasolinera Avenida de las Américas',
  ],
  'la magdalena': [
    'Parque de La Magdalena',
    'Mercado de La Magdalena',
    'Estación Metro La Magdalena',
    'Iglesia de La Magdalena',
  ],
};

function normalizarClave(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function limpiarSufijoParroquia(parroquia: string): string {
  return normalizarClave(parroquia)
    .replace(/\s*\((matriz|cabecera cantonal)\)\s*$/i, '')
    .trim();
}

function deduplicar(items: readonly string[]): string[] {
  const vistos = new Set<string>();
  const salida: string[] = [];
  for (const item of items) {
    const limpio = item.trim();
    const clave = normalizarClave(limpio);
    if (!limpio || vistos.has(clave)) continue;
    vistos.add(clave);
    salida.push(limpio);
  }
  return salida;
}

export function obtenerParroquiasPorCanton(canton: string): string[] {
  const limpio = canton.trim();
  if (!limpio) return [];
  const exactas = PARROQUIAS_POR_CANTON[normalizarClave(limpio)];
  if (exactas?.length) return [...exactas];
  return [
    `${limpio} (Matriz / Centro)`,
    `Parroquia Urbana Norte de ${limpio}`,
    `Parroquia Urbana Sur de ${limpio}`,
  ];
}

export function obtenerLugaresConocidosParroquia(parroquia: string, canton = ''): string[] {
  const limpia = parroquia.trim();
  if (!limpia) return [];
  const nombreCorto = limpia.replace(/\s*\((matriz|cabecera cantonal)\)\s*$/i, '').trim() || limpia;
  const clave = normalizarClave(limpia);
  const claveCorta = limpiarSufijoParroquia(limpia);
  const claveCompuesta = canton.trim() ? `${normalizarClave(canton)}:${claveCorta}` : '';
  const curados =
    (claveCompuesta ? LUGARES_POR_PARROQUIA[claveCompuesta] : undefined) ??
    LUGARES_POR_PARROQUIA[clave] ??
    LUGARES_POR_PARROQUIA[claveCorta] ??
    [];
  const genericos = [
    `Parque Central de ${nombreCorto}`,
    `Gasolinera de ${nombreCorto}`,
    `Iglesia de ${nombreCorto}`,
    `Mercado de ${nombreCorto}`,
    `Subcentro de Salud de ${nombreCorto}`,
    `Unidad Educativa ${nombreCorto}`,
    `GAD Parroquial / Tenencia Política de ${nombreCorto}`,
    `Entrada principal a ${nombreCorto}`,
  ];
  return curados.length ? deduplicar(curados) : deduplicar(genericos);
}

export function inferirTipoPuntoDesdeNombre(nombre: string): TipoPuntoReferencia {
  const n = normalizarClave(nombre);
  if (/\bmercado\b|\bmayorista\b|\bferia\b|\bplaza\b/.test(n)) return 'MERCADO';
  if (/\bterminal\b|\banden\b/.test(n)) return 'TERMINAL';
  if (/\bbarrio\b|\bciudadela\b|\burbanizacion\b/.test(n)) return 'BARRIO';
  if (/\bsector\b|\bvia\b|\bentrada\b|\bredondel\b|\bkm\b|\by de\b/.test(n)) return 'SECTOR';
  if (
    /\bparque\b|\biglesia\b|\bgasolinera\b|\bunidad educativa\b|\bescuela\b|\bcolegio\b|\buniversidad\b|\bhospital\b|\bsubcentro\b|\bmall\b|\bestadio\b|\bmunicipio\b|\bgad\b/.test(
      n,
    )
  ) {
    return 'REFERENCIA';
  }
  return 'PARADERO';
}
