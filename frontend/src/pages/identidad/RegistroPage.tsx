import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { Link } from "react-router";
import { authApi } from "../../services/authApi";
import "./registro.css";

const estadoInicial = {
  nombres: "", apellidos: "", cedula: "", email: "", telefono: "",
  password: "", confirmPassword: "", aceptaTerminos: false,
};

function Icono({ nombre }: { nombre: string }) {
  const trazos: Record<string, ReactNode> = {
    usuario: <><circle cx="12" cy="7" r="4"/><path d="M5 21v-3a7 7 0 0 1 14 0v3Z"/></>,
    correo: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></>,
    clave: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/></>,
    cedula: <><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="10" r="2"/><path d="M5 16v-1a3 3 0 0 1 6 0v1m3-6h5m-5 4h5"/></>,
    telefono: <path d="m6 3 4 4-3 3a14 14 0 0 0 7 7l3-3 4 4-2 3C10 23 1 14 3 5Z"/>,
    ojo: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    oculto: <><path d="m3 3 18 18M10 5a12 12 0 0 1 12 7l-3 4M6 6a20 20 0 0 0-4 6s4 7 10 7a14 14 0 0 0 5-1"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{trazos[nombre]}</svg>;
}

interface CampoProps {
  nombre: Exclude<keyof typeof estadoInicial, "aceptaTerminos">;
  titulo: string;
  valor: string;
  cambiar: (event: ChangeEvent<HTMLInputElement>) => void;
  icono: string;
  placeholder: string;
  tipo?: string;
  autoComplete?: string;
  maximo?: number;
  ayuda?: string;
}

function Campo({ nombre, titulo, valor, cambiar, icono, placeholder, tipo = "text", autoComplete, maximo = 100, ayuda }: CampoProps) {
  const [visible, setVisible] = useState(false);
  const esClave = tipo === "password";
  return <div className="registro-campo">
    <label htmlFor={`registro-${nombre}`} className="registro-label">{titulo}</label>
    <div className="registro-input">
      <Icono nombre={icono}/>
      {nombre === "telefono" && <span className="registro-prefijo"><span aria-hidden="true">🇪🇨</span> +593</span>}
      <input id={`registro-${nombre}`} name={nombre} value={valor} onChange={cambiar}
        required type={esClave && visible ? "text" : tipo} autoComplete={autoComplete}
        minLength={esClave ? 8 : nombre === "cedula" ? 10 : undefined} maxLength={maximo}
        inputMode={nombre === "cedula" ? "numeric" : undefined}
        pattern={nombre === "cedula" ? "[0-9]{10}" : undefined}
        title={nombre === "cedula" ? "Ingresa los 10 dígitos de tu cédula." : undefined}
        aria-describedby={ayuda ? `registro-ayuda-${nombre}` : undefined}
        placeholder={placeholder}/>
      {esClave && <button type="button" onClick={() => setVisible(!visible)} aria-label={`${visible ? "Ocultar" : "Mostrar"} ${titulo.toLowerCase()}`} aria-pressed={visible}><Icono nombre={visible ? "oculto" : "ojo"}/></button>}
    </div>
    {ayuda && <small id={`registro-ayuda-${nombre}`}>{ayuda}</small>}
  </div>;
}

// Se conserva el formulario controlado de Matías y su integración al backend.
export default function RegistroPage() {
  const [formData, setFormData] = useState(estadoInicial);
  const [enviando, setEnviando] = useState(false);
  const ocupado = useRef(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [legal, setLegal] = useState<"terminos" | "privacidad" | null>(null);
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (ocupado.current) return;
    setError(""); setMensaje("");
    if (formData.password !== formData.confirmPassword) { setError("Las contraseñas no coinciden."); return; }
    let nacional = formData.telefono.replace(/[\s()-]/g, "");
    if (nacional.startsWith("+593")) nacional = nacional.slice(4);
    if (nacional.startsWith("0")) nacional = nacional.slice(1);
    if (!/^9\d{8}$/.test(nacional)) { setError("Ingresa un número celular ecuatoriano válido."); return; }
    ocupado.current = true; setEnviando(true);
    try {
      const resultado = await authApi.register({
        nombres: formData.nombres, apellidos: formData.apellidos,
        tipoDocumento: "CEDULA", documento: formData.cedula, email: formData.email,
        telefono: "+593" + nacional, password: formData.password, aceptaTerminos: formData.aceptaTerminos,
      });
      setFormData({ ...estadoInicial }); setMensaje(resultado.mensaje);
    } catch (causa) { setError(causa instanceof Error ? causa.message : "No se pudo crear la cuenta. Inténtalo de nuevo."); }
    finally { ocupado.current = false; setEnviando(false); }
  };
  const campo = { cambiar: handleChange };
  return <section className="registro" aria-labelledby="registro-titulo">
    <div className="registro-grid">
      <aside className="registro-portada" aria-label="Viaja con Gran Continental">
        <h2>Crea tu cuenta<br/>y viaja con<br/>nosotros</h2>
        <p><Icono nombre="usuario"/>Guarda tus datos y consulta tus viajes.</p>
      </aside>
      <div className="registro-formulario">
        <h1 id="registro-titulo">Crear cuenta</h1>
        <p className="registro-subtitulo">Completa tus datos para registrarte en Gran Continental.</p>
        {mensaje ? <div role="status" className="registro-exito"><p>{mensaje}</p><Link to="/iniciar-sesion">Ir a iniciar sesión →</Link></div> : <form onSubmit={handleSubmit}>
          <fieldset disabled={enviando} className="registro-controles">
            <legend className="sr-only">Datos de la nueva cuenta</legend>
            <div className="registro-par">
              <Campo {...campo} nombre="nombres" titulo="Nombres" valor={formData.nombres} icono="usuario" placeholder="Tus nombres" autoComplete="given-name"/>
              <Campo {...campo} nombre="apellidos" titulo="Apellidos" valor={formData.apellidos} icono="usuario" placeholder="Tus apellidos" autoComplete="family-name"/>
            </div>
            <Campo {...campo} nombre="cedula" titulo="Cédula" valor={formData.cedula} icono="cedula" placeholder="Ingresa tu número de cédula" maximo={10}/>
            <Campo {...campo} nombre="email" titulo="Correo electrónico" valor={formData.email} icono="correo" placeholder="nombre@correo.com" tipo="email" autoComplete="email" maximo={254}/>
            <Campo {...campo} nombre="telefono" titulo="Teléfono / WhatsApp" valor={formData.telefono} icono="telefono" placeholder="99 123 4567" tipo="tel" autoComplete="tel-national" maximo={20} ayuda="Ingresa tu celular sin el cero inicial."/>
            <div className="registro-par registro-claves">
              <Campo {...campo} nombre="password" titulo="Contraseña" valor={formData.password} icono="clave" placeholder="••••••••••" tipo="password" autoComplete="new-password" maximo={128} ayuda="Usa al menos 8 caracteres."/>
              <Campo {...campo} nombre="confirmPassword" titulo="Confirmar contraseña" valor={formData.confirmPassword} icono="clave" placeholder="••••••••••" tipo="password" autoComplete="new-password" maximo={128}/>
            </div>
            <div className="registro-condiciones">
              <input id="registro-aceptaTerminos" name="aceptaTerminos" type="checkbox" required checked={formData.aceptaTerminos} onChange={handleChange} aria-label="Acepto los términos y condiciones y la política de privacidad"/>
              <span><label htmlFor="registro-aceptaTerminos">Acepto los </label><button type="button" onClick={() => setLegal(legal === "terminos" ? null : "terminos")} aria-expanded={legal === "terminos"} aria-controls="registro-legal">términos y condiciones</button> y la <button type="button" onClick={() => setLegal(legal === "privacidad" ? null : "privacidad")} aria-expanded={legal === "privacidad"} aria-controls="registro-legal">política de privacidad</button>.</span>
            </div>
            {legal && <div id="registro-legal" className="registro-legal"><strong>{legal === "terminos" ? "Términos de la versión académica" : "Privacidad en la versión académica"}</strong><p>{legal === "terminos" ? "Esta versión permite probar la creación de cuentas y el acceso al proyecto. No realiza compras reales. Los términos definitivos están pendientes de publicación." : "Los datos del formulario se guardan en la base compartida del proyecto. El correo se utiliza para bienvenida y recuperación de cuenta. Usa una contraseña exclusiva para esta prueba. La política definitiva está pendiente de publicación."}</p></div>}
            {error && <p role="alert" className="registro-error">{error}</p>}
            <button className="registro-enviar" type="submit" disabled={enviando}><Icono nombre="usuario"/>{enviando ? "Creando cuenta…" : "Crear cuenta"}</button>
          </fieldset>
        </form>}
        <p className="registro-acceso">¿Ya tienes una cuenta? <Link to="/iniciar-sesion">Inicia sesión</Link></p>
        <Link to="/" className="registro-volver">← <span>Volver al inicio</span></Link>
      </div>
    </div>
  </section>;
}
