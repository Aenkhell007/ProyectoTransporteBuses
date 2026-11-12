import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ConfiguracionCooperativaTabs, IconoConfiguracion } from './ConfiguracionCooperativaTabs';
import { botonConfiguracion, entradaConfiguracion, guardarConfiguracion } from './EditorConfiguracionGlobal';

export interface IdentidadCooperativaDatos {
  version: number;
  nombre: string;
  razonSocial: string;
  ruc: string;
  lema: string;
  logoUrl: string;
  primario: string;
  secundario: string;
  texto: string;
  email: string;
  telefono: string;
  whatsapp: string;
  direccion: string;
  facebook: string;
  instagram: string;
}

function luminancia(hex: string) {
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
const hexValido = (valor: string) => /^#[0-9a-f]{6}$/i.test(valor);
export function contrasteColor(fondo: string, texto: string) {
  if (!hexValido(fondo) || !hexValido(texto)) return 0;
  const a = luminancia(fondo), b = luminancia(texto);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
function redValida(valor: string, dominios: string[]) {
  if (!valor) return true;
  try { const url = new URL(valor); return url.protocol === 'https:' && !url.username && !url.password && dominios.includes(url.hostname); } catch { return false; }
}
export function validarIdentidad(datos: IdentidadCooperativaDatos) {
  const errores: Partial<Record<keyof IdentidadCooperativaDatos, string>> = {};
  if (!datos.nombre.trim()) errores.nombre = 'Ingresa el nombre comercial.';
  if (!datos.razonSocial.trim()) errores.razonSocial = 'Ingresa la razón social.';
  if (!/^\d{13}$/.test(datos.ruc)) errores.ruc = 'El RUC debe contener 13 dígitos.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) errores.email = 'Ingresa un correo válido.';
  for (const campo of ['telefono', 'whatsapp'] as const) if (datos[campo] && !/^\+[1-9]\d{7,14}$/.test(datos[campo])) errores[campo] = 'Usa formato internacional, por ejemplo +593 seguido del número.';
  for (const campo of ['primario', 'secundario', 'texto'] as const) if (!hexValido(datos[campo])) errores[campo] = 'Usa un color hexadecimal de seis dígitos.';
  if (hexValido(datos.texto) && contrasteColor('#ffffff', datos.texto) < 4.5) errores.texto = 'El texto sobre blanco necesita contraste mínimo 4.5:1.';
  if (!redValida(datos.facebook, ['facebook.com', 'www.facebook.com'])) errores.facebook = 'Usa una dirección HTTPS de Facebook.';
  if (!redValida(datos.instagram, ['instagram.com', 'www.instagram.com'])) errores.instagram = 'Usa una dirección HTTPS de Instagram.';
  if (datos.lema.length > 160) errores.lema = 'El lema admite hasta 160 caracteres.';
  return errores;
}

async function validarLogo(archivo: File) {
  if (archivo.size > 2 * 1024 * 1024 || archivo.size === 0) throw new Error('El logo debe pesar como máximo 2 MB.');
  if (archivo.type === 'image/png') {
    const firma = new Uint8Array(await archivo.slice(0, 8).arrayBuffer());
    if (firma.join(',') !== '137,80,78,71,13,10,26,10') throw new Error('El archivo no es un PNG válido.');
    const imagen = await createImageBitmap(archivo);
    const dimensionesValidas = imagen.width <= 4096 && imagen.height <= 4096;
    imagen.close();
    if (!dimensionesValidas) throw new Error('El logo no debe superar 4096 × 4096 píxeles.');
  } else if (archivo.type === 'image/svg+xml') {
    const documento = new DOMParser().parseFromString(await archivo.text(), 'image/svg+xml');
    const permitidos = new Set(['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'title', 'desc', 'defs', 'linearGradient', 'radialGradient', 'stop', 'clipPath']);
    if (documento.documentElement.localName !== 'svg' || documento.querySelector('parsererror') || [...documento.querySelectorAll('*')].some(nodo => !permitidos.has(nodo.localName) || [...nodo.attributes].some(a => /^on/i.test(a.name) || /href|style/i.test(a.name) || /url\s*\(\s*(?!#)[^)]+\)/i.test(a.value)))) throw new Error('Usa un SVG estático sin scripts, estilos ni recursos externos, o un PNG.');
  } else throw new Error('Selecciona un logo PNG o SVG.');
}

interface Props {
  inicial: IdentidadCooperativaDatos;
  onGuardar?: (datos: IdentidadCooperativaDatos, logo: File | null) => Promise<IdentidadCooperativaDatos>;
}

export default function EditorIdentidad({ inicial, onGuardar }: Props) {
  const [base, setBase] = useState(inicial);
  const [datos, setDatos] = useState(inicial);
  const [logo, setLogo] = useState<File | null>(null);
  const [errores, setErrores] = useState<ReturnType<typeof validarIdentidad>>({});
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [validandoLogo, setValidandoLogo] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [previewLogo, setPreviewLogo] = useState('');
  const generacion = useRef(0);
  const archivoInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!logo) { setPreviewLogo(''); return; } const url = URL.createObjectURL(logo); setPreviewLogo(url); return () => URL.revokeObjectURL(url); }, [logo]);
  useEffect(() => () => { generacion.current += 1; }, []);
  const modificado = JSON.stringify(datos) !== JSON.stringify(base) || !!logo;
  function cambiar(campo: keyof IdentidadCooperativaDatos, valor: string) {
    setDatos(d => ({ ...d, [campo]: valor })); setMensaje(''); setError('');
    setErrores(e => ({ ...e, [campo]: undefined }));
  }
  async function cargarLogo(archivo?: File) {
    const actual = ++generacion.current;
    setLogoError('');
    if (!archivo) { setValidandoLogo(false); return; }
    setValidandoLogo(true);
    try { await validarLogo(archivo); if (actual === generacion.current) { setLogo(archivo); setMensaje(''); } }
    catch (e) { if (actual === generacion.current) setLogoError(e instanceof Error ? e.message : 'No se pudo leer el logo.'); }
    finally { if (actual === generacion.current) { setValidandoLogo(false); if (archivoInput.current) archivoInput.current.value = ''; } }
  }
  async function guardar(evento: FormEvent) {
    evento.preventDefault(); const validacion = validarIdentidad(datos); setErrores(validacion);
    if (Object.keys(validacion).length || ocupado || validandoLogo || !modificado) return;
    setOcupado(true); setError('');
    try {
      if (onGuardar) {
        const respuesta = await onGuardar({ ...datos, version: base.version }, logo);
        setBase(respuesta); setDatos(respuesta); setLogo(null); setMensaje('Identidad y contacto guardados.');
      } else {
        // Mantener el archivo evita convertir una URL temporal en un dato persistido.
        setMensaje('Vista previa confirmada. El logo y los datos siguen en el borrador local; no se publicaron.');
      }
    } catch { setError('No se pudo guardar. Conservamos el formulario y el logo para que puedas reintentar.'); }
    finally { setOcupado(false); }
  }
  function cancelar() { generacion.current += 1; setDatos(base); setLogo(null); setErrores({}); setLogoError(''); setValidandoLogo(false); setError(''); setMensaje('Se restauró la identidad original.'); }
  function campo(nombre: keyof IdentidadCooperativaDatos, etiqueta: string, tipo = 'text') {
    return <label className="grid gap-1.5 text-sm">{etiqueta}<input type={tipo} className={entradaConfiguracion} value={String(datos[nombre])} maxLength={nombre === 'lema' ? 160 : 254} aria-invalid={!!errores[nombre]} aria-describedby={errores[nombre] ? `error-${nombre}` : undefined} onChange={e => cambiar(nombre, e.target.value)} />{errores[nombre] && <span id={`error-${nombre}`} className="text-xs text-red-700">{errores[nombre]}</span>}</label>;
  }
  const colores = { primario: hexValido(datos.primario) ? datos.primario : '#ff0018', secundario: hexValido(datos.secundario) ? datos.secundario : '#00833e', texto: hexValido(datos.texto) ? datos.texto : '#08035b' };
  const textoBoton = contrasteColor(colores.primario, '#ffffff') >= 4.5 ? '#ffffff' : '#000000';
  return <form onSubmit={guardar} noValidate className="space-y-4 text-[#08035b]">
    <header className="flex items-start gap-3"><span className="rounded-xl bg-blue-50 p-2"><IconoConfiguracion nombre="ajustes" className="h-8 w-8" /></span><div><h1 className="text-2xl font-bold sm:text-3xl">Configuración de la cooperativa</h1><p className="mt-1 text-sm text-indigo-700">Personaliza la identidad y los datos de contacto de tu cooperativa.</p></div></header>
    <ConfiguracionCooperativaTabs />
    {!onGuardar && <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">Vista previa con datos de ejemplo. Los cambios son locales; todavía no se publican en el servidor.</p>}
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <fieldset disabled={ocupado} className="min-w-0 space-y-3">
        <TarjetaIdentidad titulo="Identidad de la cooperativa" icono="identidad">
          <div className="mb-4 grid items-center gap-4 sm:grid-cols-2"><div className="grid h-28 place-items-center rounded-lg border border-blue-100 bg-white p-3"><img src={previewLogo || datos.logoUrl} alt="Logo de la cooperativa" className="max-h-24 w-full object-contain" /></div><div><label className={botonConfiguracion + ' inline-flex cursor-pointer items-center gap-2'}><IconoConfiguracion nombre="subir" className="h-5 w-5" />Cambiar logo<input ref={archivoInput} type="file" accept="image/png,image/svg+xml" className="sr-only" onChange={e => void cargarLogo(e.target.files?.[0])} /></label><p className="mt-2 text-xs leading-5 text-indigo-700">Formatos permitidos: PNG, SVG. Máximo 2 MB.<br/>Tamaño recomendado: 400 × 200 px.</p></div></div>
          {logoError && <p role="alert" className="mb-3 text-sm text-red-700">{logoError}</p>}{validandoLogo && <p role="status">Validando logo…</p>}
          <div className="grid gap-3 sm:grid-cols-2">{campo('nombre', 'Nombre comercial *')}{campo('razonSocial', 'Razón social *')}{campo('ruc', 'RUC *')}{campo('lema', 'Lema')}</div>
        </TarjetaIdentidad>
        <TarjetaIdentidad titulo="Colores de la aplicación" icono="colores"><div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{([['primario', 'Color primario'], ['secundario', 'Color secundario'], ['texto', 'Color de texto']] as const).map(([nombre, etiqueta]) => <label key={nombre} className="grid gap-2 text-xs">{etiqueta}<span className="flex min-w-0 items-center overflow-hidden rounded-md border border-indigo-200 bg-blue-50/30"><input type="color" aria-label={'Elegir ' + etiqueta.toLowerCase()} value={colores[nombre]} onChange={e => cambiar(nombre, e.target.value)} className="h-10 w-10 shrink-0 cursor-pointer border-0 bg-transparent p-1" /><input aria-label={'Código ' + etiqueta.toLowerCase()} value={String(datos[nombre])} onChange={e => cambiar(nombre, e.target.value)} maxLength={7} aria-invalid={!!errores[nombre]} className="min-w-0 w-full bg-transparent px-2 py-2 text-xs uppercase outline-blue-600" /></span>{errores[nombre] && <span className="text-red-700">{errores[nombre]}</span>}</label>)}</div><p className="mt-2 text-[11px] text-indigo-700">Los colores no alteran el logo. Contraste mínimo del texto: 4.5:1.</p></TarjetaIdentidad>
        <TarjetaIdentidad titulo="Datos de contacto" icono="telefono"><div className="grid gap-3 sm:grid-cols-2">{campo('email', 'Correo de soporte *', 'email')}{campo('telefono', 'Teléfono', 'tel')}{campo('whatsapp', 'WhatsApp', 'tel')}{campo('direccion', 'Dirección')}</div></TarjetaIdentidad>
        <TarjetaIdentidad titulo="Redes sociales" icono="redes"><div className="grid gap-3 sm:grid-cols-2">{campo('facebook', 'Facebook', 'url')}{campo('instagram', 'Instagram', 'url')}</div></TarjetaIdentidad>
      </fieldset>
      <aside className="min-w-0 space-y-3">
        <TarjetaIdentidad titulo="Vista previa" icono="ojo"><p className="-mt-2 mb-3 text-xs text-indigo-700">Así se verá la identidad de tu cooperativa en el sitio de los clientes.</p>
          <div aria-label="Vista previa de la identidad" className="overflow-hidden rounded-lg border border-indigo-100 bg-white shadow-sm" style={{ color: colores.texto }}>
            <div className="flex items-center justify-between p-3"><img src={previewLogo || datos.logoUrl} alt="Logo en la vista previa" className="h-14 w-36 object-contain" /><span aria-hidden="true" className="text-2xl">☰</span></div>
            <div className="flex justify-between gap-2 border-b border-blue-100 px-3 pb-3 text-[10px]"><span>Inicio</span><span>Buses</span><span>Rutas</span><span>Terminales</span><span>Contacto</span></div>
            <div className="relative bg-slate-900"><img src="/images/home/hero-gran-continental.webp" alt="Bus en los Andes" className="h-40 w-full object-cover opacity-70" /><div className="absolute inset-0 flex flex-col justify-center p-4 text-white"><h3 className="max-w-48 text-xl font-bold leading-tight">Viaja con {datos.nombre || 'tu cooperativa'}</h3><p className="mt-2 text-xs italic">{datos.lema}</p></div></div>
            <div className="space-y-3 bg-slate-50 p-3"><div className="rounded-lg bg-white p-2 shadow-sm"><div className="mb-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs"><div className="rounded-lg border border-blue-100 p-2"><span className="block text-[10px]">Origen</span><strong>Quito</strong></div><span aria-hidden="true">⇄</span><div className="rounded-lg border border-blue-100 p-2"><span className="block text-[10px]">Destino</span><strong>Guayaquil</strong></div></div><span className="flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold" style={{ background: colores.primario, color: textoBoton }}><IconoConfiguracion nombre="lupa" className="h-4 w-4"/>Buscar pasajes</span></div>
              <div className="flex items-center gap-3 rounded-lg bg-green-100 p-3 text-green-900"><IconoConfiguracion nombre="personas"/><div><strong className="block text-xs">Ejecutivo en línea</strong><span className="text-[10px]">Te ayudamos a encontrar tu ruta</span></div><span className="ml-auto">›</span></div>
              <div className="rounded-lg border border-blue-100 bg-white p-3"><h3 className="text-sm font-bold">¿Necesitas ayuda?</h3><p className="mt-1 text-[11px]">Nuestro equipo está listo para asistirte.</p><div className="mt-3 grid grid-cols-2 gap-2 text-center text-[11px]"><span className="rounded border border-green-600 p-2 text-green-800">Escríbenos por WhatsApp</span><span className="rounded border border-indigo-600 p-2">Envíanos un correo</span></div>{datos.email && <p className="mt-2 break-words text-[11px]">{datos.email}</p>}</div>
            </div>
          </div>
        </TarjetaIdentidad>
        <p className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs leading-5"><IconoConfiguracion nombre="info" className="h-5 w-5 shrink-0 text-blue-600"/>Estos cambios se aplican únicamente al espacio de tu cooperativa. La vista previa no envía mensajes ni realiza búsquedas.</p>
        <div className="flex justify-end gap-3"><button type="button" className={botonConfiguracion} disabled={ocupado || (!modificado && !logoError)} onClick={cancelar}>Cancelar</button><button type="submit" className={guardarConfiguracion + ' inline-flex items-center gap-2'} disabled={ocupado || validandoLogo || !modificado}><IconoConfiguracion nombre="guardar" className="h-5 w-5"/>{ocupado ? 'Guardando…' : 'Guardar configuración'}</button></div>
      </aside>
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{mensaje && <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800">{mensaje}</p>}
  </form>;
}

function TarjetaIdentidad({ titulo, icono, children }: { titulo: string; icono: string; children: ReactNode }) {
  return <section className="rounded-lg border border-blue-100 bg-white p-3 sm:p-4"><h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><span className="rounded-lg bg-blue-50 p-1.5"><IconoConfiguracion nombre={icono} /></span>{titulo}</h2>{children}</section>;
}
