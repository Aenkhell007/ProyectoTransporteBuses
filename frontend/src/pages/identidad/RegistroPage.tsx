import {IconoBiblioteca, type NombreIconoBiblioteca} from '../../components/ui/IconoBiblioteca';
import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link } from "react-router";
import { authApi } from "../../services/authApi";
import { POLITICA_PRIVACIDAD } from "../../features/privacidad/politicaPrivacidad";
import "./registro.css";
import { PresentacionAuth } from "../../components/auth/PresentacionAuth";

const estadoInicial = {
  nombres: "", apellidos: "", cedula: "", email: "", telefono: "",
  password: "", confirmPassword: "", aceptaTerminos: false,
};

function Icono({ nombre }: { nombre: string }) {
  return <IconoBiblioteca nombre={nombre as NombreIconoBiblioteca} className="h-6 w-6"/>;
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
      {nombre === "telefono" && <span className="registro-prefijo" aria-label="Ecuador, prefijo +593"><img className="registro-bandera" src="/images/banderas/ecuador.svg" alt="" width="24" height="16"/> +593</span>}
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
  return <PresentacionAuth registro>
      <div className="registro-contenido">
        <h1 id="registro-titulo">Crear cuenta</h1>
        <p className="registro-subtitulo">Completa tus datos para registrarte en Gran Continental.</p>
        {mensaje ? <div role="status" className="registro-exito"><p>{mensaje}</p><Link to="/reenviar-activacion">¿No recibiste el correo? Solicitar otro enlace</Link><br/><Link to="/iniciar-sesion">Iniciar sesión después de activar mi cuenta →</Link></div> : <form onSubmit={handleSubmit}>
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
            {legal && <div id="registro-legal" className="registro-legal">
              {legal === "terminos" ? <>
                <strong>Términos de la versión académica</strong>
                <p>Esta versión permite probar la creación de cuentas y el acceso al proyecto. No realiza compras reales. Los términos definitivos están pendientes de publicación.</p>
              </> : <>
                <strong>Política de privacidad de la versión académica</strong>
                <p>Versión {POLITICA_PRIVACIDAD.version} · <time dateTime={POLITICA_PRIVACIDAD.fecha}>{new Intl.DateTimeFormat("es-EC", { dateStyle: "long", timeZone: "UTC" }).format(new Date(POLITICA_PRIVACIDAD.fecha))}</time></p>
                {POLITICA_PRIVACIDAD.secciones.map(({ titulo, texto }) => (
                  <p key={titulo}><strong>{titulo}. </strong>{texto}</p>
                ))}
                <p><strong>Solicitud de eliminación. </strong>{POLITICA_PRIVACIDAD.solicitudEliminacion} <a href={`mailto:${POLITICA_PRIVACIDAD.contacto}`}>{POLITICA_PRIVACIDAD.contacto}</a>.</p>
              </>}
            </div>}
            {error && <p role="alert" className="registro-error">{error}</p>}
            <button className="registro-enviar" type="submit" disabled={enviando}><Icono nombre="usuario"/>{enviando ? "Creando cuenta…" : "Crear cuenta"}</button>
          </fieldset>
        </form>}
        <p className="registro-acceso">¿Ya tienes una cuenta? <Link to="/iniciar-sesion">Inicia sesión</Link></p>
        <Link to="/" className="registro-volver">← <span>Volver al inicio</span></Link>
      </div>
  </PresentacionAuth>;
}
