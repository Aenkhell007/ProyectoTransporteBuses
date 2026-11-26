import { useState } from "react";
import { pagosApi } from "../../features/pagos/pagosApi";

type RespuestaWallet = Awaited<ReturnType<typeof pagosApi.obtenerGoogleWallet>>;

interface BotonGoogleWalletProps {
  reservaId: string;
  className?: string;
}

/** Botón oficial para añadir el boleto digital de bus a Google Wallet (Android). */
export function BotonGoogleWallet({ reservaId, className = "" }: BotonGoogleWalletProps) {
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<RespuestaWallet | null>(null);
  const [error, setError] = useState("");

  async function abrirWallet() {
    if (cargando) return;
    setCargando(true);
    setError("");
    try {
      const resp = await pagosApi.obtenerGoogleWallet(reservaId);
      setResultado(resp);
      if (resp.disponible) {
        window.open(resp.saveUrl, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo preparar el pase de Google Wallet.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="space-y-2 print:hidden">
      <button
        type="button"
        disabled={cargando}
        onClick={() => void abrirWallet()}
        className={`flex min-h-[43px] w-full items-center justify-center gap-2.5 rounded-full border border-[#3c4043] bg-[#1f1f1f] px-4 py-2 text-[15px] font-medium text-white transition hover:bg-black focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#167bff] disabled:opacity-60 ${className}`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0">
          <rect x="2" y="5" width="20" height="14" rx="3" fill="#4285F4" />
          <path d="M2 8.5h20V11H2z" fill="#EA4335" />
          <path d="M2 11h20v2.5H2z" fill="#FBBC04" />
          <path d="M2 13.5h20V16a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-2.5z" fill="#34A853" />
          <rect x="3.5" y="13" width="17" height="5" rx="1.5" fill="#1F1F1F" opacity="0.22" />
        </svg>
        <span>{cargando ? "Preparando Google Wallet…" : "Agregar a Google Wallet"}</span>
      </button>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </p>
      )}

      {resultado?.disponible && (
        <div role="status" className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800">
          <span>Pase generado para Android. </span>
          <a
            href={resultado.saveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-blue-700 underline"
          >
            Abrir en Google Wallet
          </a>
        </div>
      )}

      {resultado && !resultado.disponible && (
        <div
          role="status"
          className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 text-left text-xs text-blue-950"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold">Modo demostración — Google Wallet (Android)</p>
              <p className="mt-1 text-blue-900">{resultado.motivo}</p>
              <p className="mt-1 text-blue-800">
                Pasajeros listos: <strong>{resultado.vistaPrevia.objetos}</strong> · Código QR:{" "}
                <code className="rounded bg-white/80 px-1">{resultado.vistaPrevia.barcode}</code> · Guía:{" "}
                <code className="rounded bg-white/80 px-1">{resultado.guia}</code>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setResultado(null)}
              className="shrink-0 rounded px-2 py-1 text-xs font-medium text-blue-800 hover:bg-blue-100"
              aria-label="Cerrar aviso de Google Wallet"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
