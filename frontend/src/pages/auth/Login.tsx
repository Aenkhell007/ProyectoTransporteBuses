import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { destinoTrasLogin } from "../../features/auth/destinoTrasLogin";
import { useAuth } from "../../features/auth/AuthContext";

import { Icono } from "../../components/compra/Icono";
import { PresentacionAuth, IconoClave, campoAuth, botonAuth } from "../../components/auth/PresentacionAuth";

export default function Login() {
  const { usuario, cargando, login } = useAuth();
  const location = useLocation();
  const destino = destinoTrasLogin(location.state?.from);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  if (!cargando && usuario) return <Navigate to={destino} state={destino.state} replace />;
  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (enviando) return;
    setEnviando(true); setError("");
    try { await login(email, password); setPassword("");  }
    catch (error) { setError(error instanceof Error ? error.message : "No se pudo iniciar sesión."); }
    finally { setEnviando(false); }
  }
  return (
    <PresentacionAuth>
      <header className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl xl:text-[42px]">Iniciar sesión</h1>
        <p className="mt-3 text-base text-blue-700 sm:text-lg">Accede a tu cuenta para gestionar tus viajes.</p>
      </header>
      <form onSubmit={enviar} className="mt-8 space-y-6">
        <div>
          <label htmlFor="login-email" className="mb-2 block font-semibold">Correo electrónico</label>
          <div className="relative"><span className="pointer-events-none absolute left-4 top-4 text-indigo-400"><Icono nombre="correo" className="h-6 w-6" /></span>
            <input id="login-email" name="email" required type="email" autoComplete="username" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.com" className={campoAuth} />
          </div>
        </div>
        <div>
          <label htmlFor="login-password" className="mb-2 block font-semibold">Contraseña</label>
          <div className="relative"><span className="pointer-events-none absolute left-4 top-4 text-indigo-400"><IconoClave /></span>
            <input id="login-password" name="password" required type={visible ? "text" : "password"} autoComplete="current-password" maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••" className={`${campoAuth} pr-14`} />
            <button type="button" aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={visible} onClick={() => setVisible(!visible)} className="absolute right-1 top-1 flex h-12 w-12 items-center justify-center rounded-md text-indigo-500 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-blue-700"><IconoClave ojo visible={visible} /></button>
          </div>
        </div>
        <div className="text-right"><Link to="/recuperar-contrasena" className="text-blue-700 underline-offset-4 hover:underline">¿Olvidaste tu contraseña?</Link></div>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <button type="submit" disabled={enviando || cargando} className={botonAuth}><Icono nombre="persona" className="h-6 w-6" />{enviando ? "Iniciando sesión…" : "Iniciar sesión"}</button>
      </form>
      <Link to="/reenviar-activacion" className="mt-5 text-center text-sm text-blue-700 underline">¿No recibiste el correo para activar tu cuenta?</Link>
      <p className="mt-7 border-t border-indigo-100 pt-7 text-center">¿Aún no tienes una cuenta? <Link to="/registrarse" className="font-semibold text-red-600 underline underline-offset-4">Regístrate</Link></p>
      <Link to="/" className="mt-9 flex min-h-11 items-center justify-center gap-3 text-blue-700 hover:underline"><Icono nombre="flechaIzquierda" />Volver al inicio</Link>
    </PresentacionAuth>
  );
}
