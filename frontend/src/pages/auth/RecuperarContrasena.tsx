import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { authApi } from "../../services/authApi";

import { Icono } from "../../components/compra/Icono";
import { PresentacionAuth, campoAuth, botonAuth } from "../../components/auth/PresentacionAuth";

export default function RecuperarContrasena() {
  const [email,setEmail] = useState("");
  const [mensaje,setMensaje] = useState("");
  const [error,setError] = useState("");
  const [enviando,setEnviando] = useState(false);
  const bloqueo = useRef(false);
  async function enviar(e:FormEvent<HTMLFormElement>) {
    e.preventDefault(); if(bloqueo.current) return;
    bloqueo.current=true;setEnviando(true);setError("");setMensaje("");
    try {setMensaje((await authApi.forgot(email)).mensaje);}
    catch(e){setError(e instanceof Error?e.message:"No se pudo completar la solicitud.");}
    finally{bloqueo.current=false;setEnviando(false);}
  }
  return (
    <PresentacionAuth recuperacion>
      <header className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Recuperar contraseña</h1>
        <p className="mt-3 text-base text-blue-700 sm:text-lg">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
      </header>
      <form onSubmit={enviar} className="mt-9 space-y-6">
        <div>
          <label htmlFor="recuperar-email" className="mb-2 block font-semibold">Correo electrónico</label>
          <div className="relative"><span className="pointer-events-none absolute left-4 top-4 text-indigo-400"><Icono nombre="correo" className="h-6 w-6" /></span>
            <input id="recuperar-email" name="email" required type="email" autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="nombre@correo.com" className={campoAuth} />
          </div>
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {mensaje && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-900">{mensaje} Revisa también la carpeta de spam.</p>}
        <button type="submit" disabled={enviando} className={botonAuth}><Icono nombre="enviar" className="h-6 w-6" />{enviando?"Enviando…":"Enviar enlace"}</button>
      </form>
      <p className="mt-6 flex items-center gap-4 rounded-lg bg-blue-50 p-5 text-sm leading-6 text-blue-700"><Icono nombre="escudo" className="h-8 w-8" />Por seguridad, si el correo está registrado, recibirás instrucciones para recuperar tu acceso.</p>
      <Link to="/iniciar-sesion" className="mt-8 flex min-h-14 items-center justify-center gap-3 border-t border-indigo-100 pt-6 text-blue-700 hover:underline"><Icono nombre="flechaIzquierda" />Volver a iniciar sesión</Link>
      <p className="mt-8 text-center">¿No tienes una cuenta? <Link to="/registrarse" className="font-semibold text-red-600 underline underline-offset-4">Regístrate</Link></p>
    </PresentacionAuth>
  );
}
