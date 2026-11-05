import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { authApi } from "../../services/authApi";
export default function RestablecerContrasena() {
  const location=useLocation();const navigate=useNavigate();
  const [token]=useState(()=>new URLSearchParams(location.hash.slice(1)).get("token")??"");
  const [password,setPassword]=useState("");const [confirmar,setConfirmar]=useState("");
  const [mensaje,setMensaje]=useState("");const [error,setError]=useState("");const [enviando,setEnviando]=useState(false);
  const bloqueo=useRef(false);
  useEffect(()=>{if(location.hash) navigate(location.pathname,{replace:true});},[location.hash,location.pathname,navigate]);
  async function enviar(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(bloqueo.current)return;setError("");
    if(password!==confirmar){setError("Las contraseñas no coinciden.");return;}
    bloqueo.current=true;setEnviando(true);
    try{setMensaje((await authApi.reset(token,password)).mensaje);setPassword("");setConfirmar("");}
    catch(e){setError(e instanceof Error?e.message:"No se pudo cambiar la contraseña.");}
    finally{bloqueo.current=false;setEnviando(false);}
  }
  const control="mt-2 block min-h-11 w-full rounded border border-slate-300 p-3 font-normal";
  return <section className="mx-auto my-8 w-[calc(100%-24px)] max-w-md rounded-lg bg-white p-6 sm:p-8">
    <h1 className="text-3xl font-bold text-blue-950">Nueva contraseña</h1>
    {!/^[A-Za-z0-9_-]{43}$/.test(token)?<p role="alert" className="mt-5 text-red-800">Abre el enlace que recibiste por correo o solicita uno nuevo.</p>:mensaje?<p role="status" className="mt-5 rounded bg-green-50 p-3 text-green-900">{mensaje}</p>:<form onSubmit={enviar} className="mt-6 space-y-5">
      <label className="block text-sm font-semibold text-blue-950">Contraseña nueva<input required type="password" autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} className={control}/></label>
      <label className="block text-sm font-semibold text-blue-950">Confirmar contraseña<input required type="password" autoComplete="new-password" minLength={8} maxLength={128} value={confirmar} onChange={e=>setConfirmar(e.target.value)} className={control}/></label>
      {error&&<p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <button type="submit" disabled={enviando} className="min-h-11 w-full rounded-md bg-[#ff0018] px-5 py-3 font-semibold text-white disabled:opacity-50">{enviando?"Guardando…":"Guardar contraseña"}</button>
    </form>}
    <Link to="/recuperar-contrasena" className="mt-5 block text-sm text-blue-700 underline">Solicitar otro enlace</Link>
    <Link to="/iniciar-sesion" className="mt-3 block text-sm text-blue-700 underline">Volver a iniciar sesión</Link>
  </section>;
}
