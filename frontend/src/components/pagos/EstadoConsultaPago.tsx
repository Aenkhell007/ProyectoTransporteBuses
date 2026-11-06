import { Link, useLocation } from "react-router";
export default function EstadoConsultaPago({
  cargando,
  error,
  status,
  recargar,
}: {
  cargando: boolean;
  error: string;
  status: number;
  recargar: () => unknown;
}) {
  const location = useLocation();
  return (
    <section
      className="mx-auto my-6 max-w-3xl rounded-lg bg-white p-6"
      aria-live="polite"
    >
      <h1 className="text-2xl font-bold text-blue-950">
        {cargando ? "Cargando tu reserva…" : "No pudimos consultar el pago"}
      </h1>
      {!cargando && (
        <>
          <p className="mt-3 text-slate-700">{error}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {status === 401 ? (
              <Link
                to="/iniciar-sesion"
                state={{ from: location }}
                className="rounded bg-red-600 px-5 py-3 text-white"
              >
                Iniciar sesión
              </Link>
            ) : (
              <button
                onClick={() => void recargar()}
                className="rounded bg-blue-700 px-5 py-3 text-white"
              >
                Volver a consultar
              </button>
            )}
            <Link
              to="/mis-viajes"
              className="rounded border px-5 py-3 text-blue-900"
            >
              Ir a Mis viajes
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
