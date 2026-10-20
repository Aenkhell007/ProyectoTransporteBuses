import { useEffect, useRef, useState } from "react";
import type { BankAccountOption } from "./BankAccountSelector";

interface BankAccountDetailsProps {
  cuenta: BankAccountOption | undefined;
}

export default function BankAccountDetails({
  cuenta,
}: BankAccountDetailsProps) {
  const [mensaje, setMensaje] = useState("");
  const [copiado, setCopiado] = useState("");
  const [copiando, setCopiando] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  if (!cuenta) {
    return (
      <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">
        Selecciona una cuenta para consultar sus datos.
      </p>
    );
  }

  async function copiar(etiqueta: string, valor: string) {
    setCopiando(true);
    setCopiado("");
    setMensaje("");
    if (temporizador.current) clearTimeout(temporizador.current);
    try {
      await navigator.clipboard.writeText(valor);
      if (!montado.current) return;
      setCopiado(etiqueta);
      setMensaje(`${etiqueta}: copiado correctamente.`);
      temporizador.current = setTimeout(() => {
        setCopiado("");
        setMensaje("");
      }, 2500);
    } catch {
      if (!montado.current) return;
      setMensaje("No se pudo copiar. Selecciona el dato y cópialo manualmente.");
    } finally {
      if (montado.current) setCopiando(false);
    }
  }

  const datos = [
    {
      etiqueta: "Tipo de cuenta",
      valor: cuenta.tipo,
      permiteCopiar: false,
    },
    {
      etiqueta: "Número de cuenta",
      valor: cuenta.numero,
      permiteCopiar: true,
    },
    {
      etiqueta: "Titular",
      valor: cuenta.titular,
      permiteCopiar: true,
    },
    {
      etiqueta: "RUC",
      valor: cuenta.ruc,
      permiteCopiar: true,
    },
  ];

  return (
    <section aria-label={`Datos bancarios de ${cuenta.banco}`}>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_224px]">
        <div className="rounded-md border border-slate-200 p-4">
          <h3 className="mb-4 font-bold text-blue-950">{cuenta.banco}</h3>

          <dl className="space-y-3">
            {datos.map((dato) => (
              <div
                key={dato.etiqueta}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-b border-slate-100 pb-3 sm:grid-cols-[130px_minmax(0,1fr)_auto]"
              >
                <dt className="col-span-2 text-xs text-slate-500 sm:col-span-1">
                  {dato.etiqueta}
                </dt>

                <dd className="min-w-0 select-all break-words text-sm text-blue-950">
                  {dato.valor}
                </dd>

                {dato.permiteCopiar && (
                  <button
                    type="button"
                    onClick={() => {
                      void copiar(dato.etiqueta, dato.valor);
                    }}
                    disabled={copiando}
                    aria-label={`${copiado === dato.etiqueta ? "Copiado" : "Copiar"}: ${dato.etiqueta.toLowerCase()}`}
                    className={`min-w-20 self-start rounded px-2 py-1 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-60 ${copiado === dato.etiqueta ? "bg-green-100 text-green-800" : "text-blue-700 hover:bg-blue-50"}`}
                  >
                    {copiado === dato.etiqueta ? "✓ Copiado" : "Copiar"}
                  </button>
                )}
              </div>
            ))}
          </dl>

          <span className="mt-3 inline-block rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">
            Datos de ejemplo
          </span>
        </div>

        <figure className="flex min-w-0 flex-col items-center justify-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-center">
          {cuenta.qrSrc ? (
            <>
              <img
                src={cuenta.qrSrc}
                alt={`QR de demostración con los datos de ${cuenta.banco}, cuenta terminada en ${cuenta.numero.slice(-4)}`}
                width="192"
                height="192"
                className="h-auto w-full max-w-48 bg-white"
              />
              <figcaption className="text-xs leading-5 text-slate-600">
                <strong className="block text-blue-950">QR de demostración</strong>
                Escanéalo con la cámara de tu celular para leer los datos de esta
                cuenta. No permite realizar pagos.
              </figcaption>
              <a
                href={cuenta.qrSrc}
                download={`qr-${cuenta.id}.png`}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                Descargar QR
              </a>
            </>
          ) : (
            <figcaption className="text-xs leading-5 text-slate-500">
              QR bancario pendiente de configurar
            </figcaption>
          )}
        </figure>
      </div>

      <p role="status" className="mt-2 min-h-5 text-xs text-slate-600">
        {mensaje}
      </p>
    </section>
  );
}
