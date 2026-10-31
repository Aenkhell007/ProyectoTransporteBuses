import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { authApi } from "../../services/authApi";

export default function ReenviarActivacion() {
  const [email,setEmail] = useState("");
  const [mensaje,setMensaje] = useState("");
  const [error,setError] = useState("");
  const [enviando,setEnviando] = useState(false);
  const ocupado = useRef(false);
  async function enviar(e:FormEvent<HTMLFormElement>) {
    e.preventDefault(); if(ocupado.current) return;
    ocupado.current=true;setEnviando(true);setError("");setMensaje("");
    try {setMensaje((await authApi.resendActivation(email)).mensaje);}
    catch(causa){setError(causa instanceof Error ? causa.message : "No se pudo procesar la solicitud.");}
    finally{ocupado.current=false;setEnviando(false);}
  }
  return <section className="mx-auto my-8 w-[calc(100%-24px)] max-w-md rounded-lg bg-white p-6 sm:p-8">
    <h1 className="text-3xl font-bold text-blue-950">Correo de activación</h1>
    <p className="mt-4 text-slate-600">Escribe el correo con el que te registraste. Revisa también la carpeta de spam. Por seguridad, los reenvíos tienen un tiempo de espera.</p>
    <form onSubmit={enviar} className="mt-6 space-y-5">
      <label className="block text-sm font-semibold text-blue-950">Correo electrónico<input required type="email" autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 block min-h-11 w-full rounded border border-slate-300 p-3 font-normal"/></label>
      {mensaje && <p role="status" className="rounded bg-blue-50 p-4 text-blue-900">{mensaje}</p>}
      {error && <p role="alert" className="rounded bg-red-50 p-4 text-red-800">{error}</p>}
      <button type="submit" disabled={enviando} className="min-h-11 w-full rounded-md bg-[#ff0018] px-5 py-3 font-semibold text-white disabled:opacity-50">{enviando ? "Solicitando…" : "Solicitar correo de activación"}</button>
    </form>
    <Link to="/iniciar-sesion" className="mt-5 block text-sm text-blue-700 underline">Volver a iniciar sesión</Link>
  </section>;
}
