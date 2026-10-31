import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { authApi } from "../../services/authApi";

export default function ActivarCuenta() {
  const location = useLocation();
  const navigate = useNavigate();
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get("token") ?? "");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const ocupado = useRef(false);
  useEffect(() => { if (location.hash) navigate(location.pathname, {replace:true}); },[location.hash,location.pathname,navigate]);
  const valido = /^[A-Za-z0-9_-]{43}$/.test(token);
  async function activar() {
    if (ocupado.current || !valido || mensaje) return;
    ocupado.current=true; setEnviando(true); setError("");
    try { setMensaje((await authApi.activate(token)).mensaje); }
    catch(causa) { setError(causa instanceof Error ? causa.message : "No se pudo activar tu cuenta."); }
    finally { ocupado.current=false; setEnviando(false); }
  }
  return <section className="mx-auto my-8 w-[calc(100%-24px)] max-w-lg rounded-lg bg-white p-6 sm:p-8" aria-labelledby="activar-titulo">
    <h1 id="activar-titulo" className="text-3xl font-bold text-blue-950">{mensaje ? "Cuenta activada" : "Activa tu cuenta"}</h1>
    {mensaje ? <><p role="status" className="mt-5 rounded bg-green-50 p-4 text-green-900">{mensaje}</p><Link to="/iniciar-sesion" className="mt-6 flex min-h-11 items-center justify-center rounded-md bg-[#ff0018] px-5 py-3 font-semibold text-white">Iniciar sesión</Link></> : <>
      <p className="mt-4 text-slate-600">Confirma tu dirección de correo para activar tu cuenta de Gran Continental y poder iniciar sesión.</p>
      {!valido && <p role="alert" className="mt-4 rounded bg-amber-50 p-4 text-amber-900">Abre el enlace del correo de activación. Si ya lo utilizaste, intenta iniciar sesión; si venció, solicita uno nuevo.</p>}
      {error && <p role="alert" className="mt-4 rounded bg-red-50 p-4 text-red-800">{error}</p>}
      {valido && <button type="button" onClick={() => void activar()} disabled={enviando} className="mt-6 min-h-11 w-full rounded-md bg-[#ff0018] px-5 py-3 font-semibold text-white disabled:opacity-50">{enviando ? "Activando cuenta…" : "Activar mi cuenta"}</button>}
      <Link to="/reenviar-activacion" className="mt-5 block text-blue-700 underline">Solicitar otro correo de activación</Link>
      <Link to="/iniciar-sesion" className="mt-4 block text-sm text-blue-700 underline">Volver a iniciar sesión</Link>
    </>}
  </section>;
}
