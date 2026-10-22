import { useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { enviarContacto } from '../../../features/compra/catalogoApi';
import {
  CONTACTO_VACIO, LIMITES_CONTACTO, VERSION_POLITICA_PRIVACIDAD, validarContacto,
} from '../../../features/compra/contacto';
import type { ErroresContacto, FormularioContacto } from '../../../features/compra/contacto';
import { erroresPorCampo, mensajeDeError } from '../../../features/compra/errores';
import { Icono } from '../Icono';
import { EncabezadoSeccion } from './EncabezadoSeccion';

const ASUNTOS = ['Información de rutas y horarios', 'Reservas y pagos', 'Equipaje y encomiendas', 'Sugerencias o reclamos', 'Otro'];
const CORREO_SOPORTE = 'soporte@example.com';

type Envio = { estado: 'inactivo' } | { estado: 'enviando' } | { estado: 'enviado' } | { estado: 'error'; mensaje: string };

export function ContactoSeccion() {
  return (
    <section id="contacto" aria-labelledby="contacto-titulo" className="border-t border-slate-200 py-8">
      <EncabezadoSeccion idTitulo="contacto-titulo" antetitulo="Contacto" titulo="Estamos para ayudarte"
        descripcion="Si tienes consultas, sugerencias o necesitas más información, comunícate con nosotros a través de nuestros canales o completa el formulario y te responderemos pronto." />
      <div className="grid gap-5 lg:grid-cols-2">
        <ul className="space-y-3">
          <Canal icono="whatsapp" color="bg-green-600" titulo="WhatsApp" texto="Escríbenos y recibe atención rápida."
            accion={<span className="inline-flex min-h-11 items-center rounded-md bg-slate-100 px-4 text-sm text-slate-600">Número por confirmar</span>} />
          <Canal icono="correo" color="bg-red-600" titulo="Correo electrónico"
            texto={<>Envíanos tus consultas al correo: <a href={`mailto:${CORREO_SOPORTE}`} className="font-semibold text-red-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600">{CORREO_SOPORTE}</a></>} />
          <Canal icono="ubicacion" color="bg-red-600" titulo="Oficinas"
            texto="Consulta los puntos de atención en nuestras principales ciudades. La lista se publicará cuando la cooperativa registre sus oficinas." />
        </ul>
        <FormularioContactoTarjeta />
      </div>
    </section>
  );
}

function Canal({ icono, color, titulo, texto, accion }: {
  icono: 'whatsapp' | 'correo' | 'ubicacion'; color: string; titulo: string; texto: ReactNode; accion?: ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white p-4">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white ${color}`}><Icono nombre={icono} className="h-6 w-6" /></span>
      <span className="min-w-[12rem] flex-1">
        <span className="block font-semibold text-slate-900">{titulo}</span>
        <span className="text-sm break-words text-slate-600">{texto}</span>
      </span>
      {accion}
    </li>
  );
}

function FormularioContactoTarjeta() {
  const id = useId();
  const [valores, setValores] = useState<FormularioContacto>(CONTACTO_VACIO);
  const [errores, setErrores] = useState<ErroresContacto>({});
  const [envio, setEnvio] = useState<Envio>({ estado: 'inactivo' });
  // Evita un segundo envío aunque el estado todavía no haya deshabilitado el botón.
  const enviandoRef = useRef(false);

  const cambiar = <K extends keyof FormularioContacto>(campo: K, valor: FormularioContacto[K]) => {
    setValores((v) => ({ ...v, [campo]: valor }));
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: undefined }));
  };

  const enviar = async () => {
    if (enviandoRef.current) return;
    const encontrados = validarContacto(valores);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) {
      setEnvio({ estado: 'inactivo' });
      document.getElementById(`${id}-${Object.keys(encontrados)[0]}`)?.focus();
      return;
    }
    enviandoRef.current = true;
    setEnvio({ estado: 'enviando' });
    try {
      await enviarContacto({
        cooperativa_id: null,
        nombre: valores.nombre.trim(),
        email: valores.email.trim(),
        asunto: valores.asunto,
        mensaje: valores.mensaje.trim(),
        consentimiento_version: VERSION_POLITICA_PRIVACIDAD,
      });
      setValores(CONTACTO_VACIO);
      setEnvio({ estado: 'enviado' });
    } catch (error) {
      setErrores(erroresPorCampo(error) as ErroresContacto);
      setEnvio({ estado: 'error', mensaje: mensajeDeError(error) });
    } finally {
      enviandoRef.current = false;
    }
  };

  const enviando = envio.estado === 'enviando';
  const entrada = (campo: keyof ErroresContacto) =>
    `w-full rounded-md border bg-white px-3 py-2.5 text-sm outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-200 ${errores[campo] ? 'border-red-500' : 'border-slate-300'}`;
  const ayuda = (campo: keyof ErroresContacto) => errores[campo]
    ? <p id={`${id}-${campo}-error`} className="mt-1 text-sm text-red-700">{errores[campo]}</p> : null;
  const descripcion = (campo: keyof ErroresContacto) => (errores[campo] ? `${id}-${campo}-error` : undefined);

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); void enviar(); }} aria-label="Formulario de contacto"
      className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
      <div>
        <label htmlFor={`${id}-nombre`} className="mb-1 block text-sm font-semibold">Nombre</label>
        <input id={`${id}-nombre`} value={valores.nombre} maxLength={LIMITES_CONTACTO.nombre} autoComplete="name"
          placeholder="Tu nombre completo" aria-invalid={!!errores.nombre} aria-describedby={descripcion('nombre')}
          onChange={(e) => cambiar('nombre', e.target.value)} className={entrada('nombre')} />
        {ayuda('nombre')}
      </div>
      <div>
        <label htmlFor={`${id}-email`} className="mb-1 block text-sm font-semibold">Correo electrónico</label>
        <input id={`${id}-email`} type="email" value={valores.email} maxLength={LIMITES_CONTACTO.email} autoComplete="email"
          placeholder="tu@ejemplo.com" aria-invalid={!!errores.email} aria-describedby={descripcion('email')}
          onChange={(e) => cambiar('email', e.target.value)} className={entrada('email')} />
        {ayuda('email')}
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${id}-asunto`} className="mb-1 block text-sm font-semibold">Asunto</label>
        <select id={`${id}-asunto`} value={valores.asunto} aria-invalid={!!errores.asunto} aria-describedby={descripcion('asunto')}
          onChange={(e) => cambiar('asunto', e.target.value)} className={entrada('asunto')}>
          <option value="">Selecciona un asunto</option>
          {ASUNTOS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        {ayuda('asunto')}
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${id}-mensaje`} className="mb-1 block text-sm font-semibold">Mensaje</label>
        <textarea id={`${id}-mensaje`} rows={4} value={valores.mensaje} maxLength={LIMITES_CONTACTO.mensaje}
          placeholder="Cuéntanos en qué podemos ayudarte…" aria-invalid={!!errores.mensaje}
          aria-describedby={[descripcion('mensaje'), `${id}-contador`].filter(Boolean).join(' ')}
          onChange={(e) => cambiar('mensaje', e.target.value)} className={`${entrada('mensaje')} resize-y`} />
        <p id={`${id}-contador`} className="mt-1 text-right text-xs text-slate-500">{valores.mensaje.length} / {LIMITES_CONTACTO.mensaje}</p>
        {ayuda('mensaje')}
      </div>
      <div className="flex flex-col justify-center">
        <label htmlFor={`${id}-consentimiento`} className="flex items-start gap-2 text-sm text-slate-700">
          <input id={`${id}-consentimiento`} type="checkbox" checked={valores.consentimiento}
            aria-invalid={!!errores.consentimiento} aria-describedby={descripcion('consentimiento')}
            onChange={(e) => cambiar('consentimiento', e.target.checked)} className="mt-0.5 h-4 w-4 accent-red-600" />
          <span>He leído y acepto la <a href="/privacidad" className="font-semibold text-red-700 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600">Política de Privacidad</a>.</span>
        </label>
        {ayuda('consentimiento')}
      </div>
      <button type="submit" disabled={enviando} aria-busy={enviando}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-red-600 px-5 font-semibold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:bg-red-400">
        <Icono nombre="enviar" /> {enviando ? 'Enviando…' : 'Enviar mensaje'}
      </button>
      <div aria-live="polite" className="sm:col-span-2">
        {envio.estado === 'enviado' && (
          <p className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-800"><Icono nombre="checkCirculo" /> Recibimos tu mensaje. Te responderemos pronto al correo indicado.</p>
        )}
        {envio.estado === 'error' && (
          <p role="alert" className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800"><Icono nombre="alerta" /> {envio.mensaje}</p>
        )}
      </div>
    </form>
  );
}
