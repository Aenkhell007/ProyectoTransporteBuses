import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { useAuth } from "../../features/auth/AuthContext";

export default function MiCuenta() {
  const location = useLocation();
  const { usuario, cargando, errorSesion, logout } = useAuth();
  const [error, setError] = useState("");
  const [saliendo, setSaliendo] = useState(false);
  if (cargando) return <p role="status" className="m-6 rounded bg-white p-6">Consultando sesión…</p>;
  if (errorSesion) return <p role="alert" className="m-6 rounded bg-white p-6 text-red-700">{errorSesion}</p>;
  if (!usuario) return <Navigate to="/iniciar-sesion" state={{ from: location }} replace />;
  async function salir() {
    setSaliendo(true); setError("");
    try { await logout(); } catch { setError("No se pudo cerrar la sesión en el servidor. Inténtalo de nuevo."); }
    finally { setSaliendo(false); }
  }
  return <section className="mx-auto my-8 w-[calc(100%-24px)] max-w-2xl rounded-lg bg-white p-6">
    <h1 className="text-2xl font-bold text-blue-950">Mi cuenta</h1>
    <p className="mt-2 text-slate-600">Esta información procede de tu sesión y del usuario guardado en Supabase.</p>
    <dl className="mt-6 space-y-4">
      <div><dt className="text-sm text-slate-500">Nombre</dt><dd>{usuario.nombres} {usuario.apellidos}</dd></div>
      <div><dt className="text-sm text-slate-500">Correo</dt><dd className="break-all">{usuario.email}</dd></div>
      <div><dt className="text-sm text-slate-500">Roles</dt><dd>{usuario.roles.join(", ")}</dd></div>
      <div><dt className="text-sm text-slate-500">Verificación del correo</dt><dd>{usuario.email_verificado_at ? "Verificado" : "Pendiente de integrar"}</dd></div>
    </dl>
    {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    <div className="mt-6 flex flex-wrap gap-4"><Link to="/pago" className="inline-flex min-h-11 items-center rounded border border-blue-200 px-4 py-2 text-blue-900">Ir a método de pago</Link><button onClick={() => void salir()} disabled={saliendo} className="min-h-11 rounded bg-[#ff0018] px-4 py-2 text-white disabled:opacity-50">{saliendo ? "Cerrando…" : "Cerrar sesión"}</button></div>
  </section>;
}
