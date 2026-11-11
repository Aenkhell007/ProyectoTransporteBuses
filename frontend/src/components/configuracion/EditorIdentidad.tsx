import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { BloqueConfiguracion, botonConfiguracion, entradaConfiguracion, guardarConfiguracion } from './EditorConfiguracionGlobal';

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
    <header><h1 className="text-2xl font-bold sm:text-3xl">Configuración de la cooperativa</h1><p className="mt-1 text-sm text-indigo-700">Personaliza la identidad y los datos de contacto de tu cooperativa.</p></header>
    <div className="flex overflow-x-auto rounded-lg bg-blue-50 text-sm"><span className="min-w-max flex-1 border-b-2 border-blue-600 bg-white px-4 py-3 text-center font-bold">Identidad y contacto</span><span className="min-w-max flex-1 px-4 py-3 text-center text-slate-500">Pagos</span><span className="min-w-max flex-1 px-4 py-3 text-center text-slate-500">Tarifas y descuentos</span></div>
    {!onGuardar && <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-900">Vista previa · borrador local, sin conexión al servidor.</p>}
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <fieldset disabled={ocupado} className="min-w-0 space-y-4">
        <BloqueConfiguracion titulo="Identidad de la cooperativa">
          <div className="mb-5 flex flex-wrap items-center gap-4"><img src={previewLogo || datos.logoUrl} alt="Logo de la cooperativa" className="h-20 w-40 object-contain" /><label className={`${botonConfiguracion} cursor-pointer`}>Cambiar logo<input ref={archivoInput} type="file" accept="image/png,image/svg+xml" className="sr-only" onChange={e => void cargarLogo(e.target.files?.[0])} /></label><small className="text-xs text-slate-500">PNG o SVG · máximo 2 MB<br/>Recomendado: 400 × 200 px</small></div>
          {logoError && <p role="alert" className="mb-3 text-sm text-red-700">{logoError}</p>}{validandoLogo && <p role="status">Validando logo…</p>}
          <div className="grid gap-4 sm:grid-cols-2">{campo('nombre', 'Nombre comercial *')}{campo('razonSocial', 'Razón social *')}{campo('ruc', 'RUC *')}<div>{campo('lema', 'Lema')}</div></div>
        </BloqueConfiguracion>
        <BloqueConfiguracion titulo="Colores de la aplicación"><div className="grid gap-3 sm:grid-cols-3">{([['primario', 'Color primario'], ['secundario', 'Color secundario'], ['texto', 'Color de texto']] as const).map(([nombre, texto]) => <div key={nombre}><label className="mb-2 block text-sm">{texto}<input type="color" aria-label={`Elegir ${texto.toLowerCase()}`} value={colores[nombre]} onChange={e => cambiar(nombre, e.target.value)} className="mt-2 block h-10 w-full rounded border border-indigo-100" /></label>{campo(nombre, `Código ${texto.toLowerCase()}`)}</div>)}</div><p className="mt-3 text-xs text-slate-500">Los colores no alteran el logo. El texto necesita contraste mínimo 4.5:1.</p></BloqueConfiguracion>
        <BloqueConfiguracion titulo="Datos de contacto"><div className="grid gap-4 sm:grid-cols-2">{campo('email', 'Correo de soporte *', 'email')}{campo('telefono', 'Teléfono', 'tel')}{campo('whatsapp', 'WhatsApp', 'tel')}{campo('direccion', 'Dirección')}</div></BloqueConfiguracion>
        <BloqueConfiguracion titulo="Redes sociales"><div className="grid gap-4 sm:grid-cols-2">{campo('facebook', 'Facebook', 'url')}{campo('instagram', 'Instagram', 'url')}</div></BloqueConfiguracion>
      </fieldset>
      <aside className="min-w-0 rounded-lg border border-indigo-100 bg-white p-4 xl:sticky xl:top-5"><h2 className="text-lg font-bold">Vista previa</h2><p className="mt-1 text-xs text-slate-500">Así se verá la identidad que estás editando.</p><div className="mt-4 overflow-hidden rounded-lg border border-indigo-100" style={{ color: colores.texto }}><header className="flex items-center justify-between gap-3 bg-white p-3"><img src={previewLogo || datos.logoUrl} alt="Logo en la vista previa" className="h-12 w-28 object-contain" /><strong className="break-words text-sm">{datos.nombre || 'Nombre comercial'}</strong></header><div className="relative bg-slate-900"><img src="/images/home/hero-gran-continental.webp" alt="Bus en los Andes" className="h-44 w-full object-cover opacity-60" /><div className="absolute inset-0 flex flex-col justify-center p-4 text-white"><h3 className="text-xl font-bold">Viaja con {datos.nombre || 'tu cooperativa'}</h3><p className="mt-2 text-sm">{datos.lema}</p></div></div><div className="space-y-3 p-4"><div className="rounded-md p-3 text-sm" style={{ background: colores.secundario, color: contrasteColor(colores.secundario, '#ffffff') >= 4.5 ? '#fff' : '#000' }}>Conecta con nuevos destinos</div><span className="block rounded-md px-4 py-3 text-center font-semibold" style={{ background: colores.primario, color: textoBoton }}>Buscar pasajes</span><h3 className="font-bold">¿Necesitas ayuda?</h3><p className="break-words text-sm">{datos.email || 'Correo de soporte'}<br/>{datos.telefono}<br/>{datos.whatsapp}<br/>{datos.direccion}</p></div></div></aside>
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{mensaje && <p role="status" className="text-sm text-green-800">{mensaje}</p>}
    <footer className="flex flex-wrap justify-end gap-3 border-t border-indigo-100 pt-4"><button type="button" className={botonConfiguracion} disabled={ocupado || (!modificado && !logoError)} onClick={cancelar}>Cancelar</button><button type="submit" className={guardarConfiguracion} disabled={ocupado || validandoLogo || !modificado}>{ocupado ? 'Guardando…' : onGuardar ? 'Guardar configuración' : 'Confirmar vista previa'}</button></footer>
  </form>;
}
