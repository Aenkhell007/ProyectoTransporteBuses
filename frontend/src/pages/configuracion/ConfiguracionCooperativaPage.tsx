import { useEffect, useState } from 'react';
import { guardarConfiguracionCooperativa, obtenerConfiguracionCooperativa, type ConfiguracionCooperativa } from '../../services/flotaApi';

const inicial: ConfiguracionCooperativa = {
  lema: '', color_primario: '#CB102E', color_secundario: '#00833E', color_texto: '#1A2A33',
  soporte_email: '', telefono: '', whatsapp: '', direccion: '', facebook_url: '', instagram_url: '', sobre_nosotros: '', version: 1,
};

export default function ConfiguracionCooperativaPage() {
  const [datos, setDatos] = useState(inicial);
  const [estado, setEstado] = useState('Cargando configuración…');
  useEffect(() => { void obtenerConfiguracionCooperativa().then((respuesta) => { setDatos({ ...inicial, ...respuesta }); setEstado(''); }).catch(() => setEstado('No se pudo cargar la configuración.')); }, []);
  function cambiar(campo: keyof ConfiguracionCooperativa, valor: string) { setDatos((actual) => ({ ...actual, [campo]: valor })); }
  async function guardar(evento: React.FormEvent) { evento.preventDefault(); setEstado('Guardando…'); try { const respuesta = await guardarConfiguracionCooperativa(datos); setDatos((actual) => ({ ...actual, ...respuesta })); setEstado('Configuración guardada.'); } catch { setEstado('No se pudo guardar la configuración.'); } }
  const campos: Array<[keyof ConfiguracionCooperativa, string, string]> = [
    ['lema', 'Lema', 'Ej. Viajamos contigo'], ['soporte_email', 'Correo de soporte', 'soporte@cooperativa.ec'], ['telefono', 'Teléfono', '+593…'], ['whatsapp', 'WhatsApp', '+593…'], ['direccion', 'Dirección', 'Dirección de oficinas'], ['facebook_url', 'Facebook', 'https://facebook.com/…'], ['instagram_url', 'Instagram', 'https://instagram.com/…'],
  ];
  return <section className="mx-auto my-6 max-w-3xl rounded-lg bg-white p-6 shadow-sm"><h1 className="text-2xl font-bold text-blue-950">Identidad y contacto</h1><p className="mt-2 text-slate-600">Personaliza la información que verán los pasajeros.</p><form onSubmit={guardar} className="mt-6 grid gap-4 sm:grid-cols-2">{campos.map(([campo, etiqueta, placeholder]) => <label key={campo} className="grid gap-1 text-sm font-medium text-slate-700">{etiqueta}<input value={String(datos[campo] ?? '')} placeholder={placeholder} onChange={(e) => cambiar(campo, e.target.value)} className="rounded border border-slate-300 px-3 py-2" /></label>)}<label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">Sobre nosotros<textarea value={datos.sobre_nosotros ?? ''} onChange={(e) => cambiar('sobre_nosotros', e.target.value)} rows={4} className="rounded border border-slate-300 px-3 py-2" /></label><div className="flex items-center gap-4 sm:col-span-2"><button type="submit" className="rounded bg-blue-900 px-5 py-2 text-white">Guardar cambios</button>{estado && <span role="status" className="text-sm text-slate-600">{estado}</span>}</div></form></section>;
}
