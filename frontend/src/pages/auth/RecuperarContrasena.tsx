import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { authApi } from "../../services/authApi";

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
  return <section className="mx-auto my-8 w-[calc(100%-24px)] max-w-md rounded-lg bg-white p-6 sm:p-8">
    <h1 className="text-3xl font-bold text-blue-950">Recuperar contraseña</h1>
    <p className="mt-3 text-slate-600">Escribe el correo de tu cuenta. Te enviaremos un enlace para crear una contraseña nueva.</p>
    <form onSubmit={enviar} className="mt-6 space-y-5">
      <label className="block text-sm font-semibold text-blue-950">Correo electrónico<input required type="email" autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 block min-h-11 w-full rounded border border-slate-300 p-3 font-normal" /></label>
      {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {mensaje && <p role="status" className="rounded bg-green-50 p-3 text-sm text-green-900">{mensaje} Revisa también la carpeta de spam.</p>}
      <button type="submit" disabled={enviando} className="min-h-11 w-full rounded-md bg-[#ff0018] px-5 py-3 font-semibold text-white disabled:opacity-50">{enviando?"Enviando…":"Enviar enlace"}</button>
    </form>
    <Link to="/iniciar-sesion" className="mt-5 inline-block text-sm text-blue-700 underline">Volver a iniciar sesión</Link>
  </section>;
}
