import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { IconoBiblioteca } from "../../components/ui/IconoBiblioteca";
import { ErrorPagoApi, enlacePago, pagosApi } from "../../features/pagos/pagosApi";

interface EstadoResultado {
  estado: "CARGANDO" | "CANCELADO" | "PENDIENTE" | "ERROR";
  mensaje: string;
  reservaId?: string;
  sesionRequerida?: boolean;
}

export default function RespuestaPayphone() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ejecutado = useRef<string | null>(null);

  const idParam = (params.get("id") ?? "0").trim();
  const clientTransactionId = (
    params.get("clientTransactionId") ??
    params.get("clientTxId") ??
    ""
  ).trim();
  const clave = `${idParam}:${clientTransactionId}`;

  const [resultado, setResultado] = useState<EstadoResultado>({
    estado: "CARGANDO",
    mensaje: "Verificando tu transacción con PayPhone…",
  });

  const verificar = useCallback(async () => {
    const idNum = Number(idParam || "0");
    if (!clientTransactionId || !Number.isInteger(idNum) || idNum < 0) {
      setResultado({
        estado: "ERROR",
        mensaje:
          "Faltan los parámetros de retorno de PayPhone. Revisa el estado de tu reserva en Mis viajes.",
      });
      return;
    }

    setResultado({
      estado: "CARGANDO",
      mensaje: "Confirmando tu pago con PayPhone y preparando tu boleto PDF…",
    });

    try {
      const resp = await pagosApi.confirmarPayphone(idNum, clientTransactionId);
      try {
        sessionStorage.removeItem("payphone_ultimo_intento");
      } catch {
        // Ignorar errores de almacenamiento privado.
      }
      if (resp.estado === "APROBADO") {
        navigate(enlacePago("/pago/confirmacion", resp.reservaId), { replace: true });
        return;
      }
      if (resp.estado === "CANCELADO") {
        navigate(`${enlacePago("/pago", resp.reservaId)}&payphone=cancelado`, {
          replace: true,
        });
        return;
      }
      setResultado({
        estado: "PENDIENTE",
        reservaId: resp.reservaId,
        mensaje:
          resp.mensaje ||
          "PayPhone aún reporta tu pago como pendiente de confirmación.",
      });
    } catch (e) {
      const es401 = e instanceof ErrorPagoApi && e.status === 401;
      setResultado({
        estado: "ERROR",
        sesionRequerida: es401,
        mensaje: es401
          ? "No se detectó tu sesión activa al volver de PayPhone (asegúrate de usar http://127.0.0.1:5173 e iniciar sesión nuevamente para consultar tu boleto)."
          : e instanceof Error
            ? e.message
            : "No se pudo verificar el estado de la transacción en PayPhone.",
      });
    }
  }, [clientTransactionId, idParam, navigate]);

  useEffect(() => {
    if (ejecutado.current === clave) return;
    ejecutado.current = clave;
    void verificar();
  }, [clave, verificar]);

  return (
    <section className="mx-auto my-8 w-[calc(100%-24px)] max-w-xl rounded-xl border border-indigo-100 bg-white p-6 text-center font-[Arial,Helvetica,sans-serif] text-[#08035b] shadow-sm sm:p-8">
      <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-blue-50 text-blue-900">
        <IconoBiblioteca
          nombre={
            resultado.estado === "CARGANDO"
              ? "movil"
              : resultado.estado === "ERROR"
                ? "alerta"
                : "info"
          }
          className="size-7"
        />
      </div>

      <h1 className="text-2xl font-bold tracking-tight">
        {resultado.estado === "CARGANDO"
          ? "Confirmando pago con PayPhone"
          : resultado.estado === "CANCELADO"
            ? "Pago cancelado en PayPhone"
            : resultado.estado === "PENDIENTE"
              ? "Pago pendiente de confirmación"
              : "No pudimos confirmar el retorno"}
      </h1>

      <p role="status" className="mt-3 text-sm leading-6 text-slate-700">
        {resultado.mensaje}
      </p>

      {resultado.estado !== "CARGANDO" && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {clientTransactionId && (
            <button
              type="button"
              onClick={() => void verificar()}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50"
            >
              Reintentar verificación
            </button>
          )}
          {resultado.reservaId ? (
            <Link
              to={enlacePago("/pago", resultado.reservaId)}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#ff0018] px-5 py-2 text-sm font-semibold text-white no-underline hover:bg-red-700"
            >
              Volver a métodos de pago
            </Link>
          ) : resultado.sesionRequerida ? (
            <Link
              to="/iniciar-sesion"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#ff0018] px-5 py-2 text-sm font-semibold text-white no-underline hover:bg-red-700"
            >
              Iniciar sesión
            </Link>
          ) : null}
          <Link
            to="/mis-viajes"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 no-underline hover:bg-slate-50"
          >
            Ir a Mis viajes
          </Link>
        </div>
      )}
    </section>
  );
}
