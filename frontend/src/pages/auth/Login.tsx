import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useAuth } from "../../features/auth/AuthContext";

export default function Login() {
  const { usuario, cargando, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  if (!cargando && usuario) return <Navigate to="/mi-cuenta" replace />;
  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (enviando) return;
    setEnviando(true); setError("");
    try { await login(email, password); setPassword(""); navigate("/mi-cuenta", { replace: true }); }
    catch (error) { setError(error instanceof Error ? error.message : "No se pudo iniciar sesión."); }
    finally { setEnviando(false); }
  }
  return <section className="mx-auto my-8 w-[calc(100%-24px)] max-w-md rounded-lg bg-white p-6 sm:p-8">
    <h1 className="text-3xl font-bold text-blue-950">Iniciar sesión</h1>
    <p className="mt-2 text-slate-600">Accede a tu cuenta para gestionar tus viajes.</p>
    <form onSubmit={enviar} className="mt-6 space-y-5">
      <label className="block text-sm font-semibold text-blue-950">Correo electrónico
        <input required type="email" autoComplete="username" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 block min-h-11 w-full rounded border border-slate-300 p-3 font-normal" />
      </label>
      <label className="block text-sm font-semibold text-blue-950">Contraseña
        <input required type={visible ? "text" : "password"} autoComplete="current-password" maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 block min-h-11 w-full rounded border border-slate-300 p-3 font-normal" />
      </label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />Mostrar contraseña</label>
      {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <button disabled={enviando || cargando} className="min-h-11 w-full rounded-md bg-[#ff0018] px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50">{enviando ? "Iniciando sesión…" : "Iniciar sesión"}</button>
    </form>
    <Link to="/reenviar-activacion" className="mt-4 block text-sm text-blue-700 underline">¿No recibiste el correo para activar tu cuenta?</Link>
    <Link to="/recuperar-contrasena" className="mt-4 block text-sm text-blue-700 underline">¿Olvidaste tu contraseña?</Link>
    <p className="mt-5 border-t border-slate-100 pt-5 text-sm">¿No tienes cuenta? <Link to="/registrarse" className="font-semibold text-red-600 underline">Regístrate</Link></p>
  </section>;
}
