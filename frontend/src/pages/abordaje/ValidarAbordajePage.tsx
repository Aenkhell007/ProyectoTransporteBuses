import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { http } from "../../services/http";
import { useAuth } from "../../features/auth/AuthContext";
import { accesoPanel } from "../../features/auth/accesoPanel";
import { destinoTrasLogin } from "../../features/auth/destinoTrasLogin";

interface PasajeroAbordaje {
  reservaAsientoId: string;
  nombre: string;
  documento: string;
  tipoDocumento: string;
  categoria: string;
  asiento: string;
  piso: number;
  estadoAsiento: string;
  abordado: boolean;
  escaneadoAt: string | null;
  operador: string | null;
}

interface BoletoAbordaje {
  boleto: { id: string; qrId: string; estado: string; emitidoAt: string | null };
  compra: {
    id: string;
    codigo: string;
    estado: string;
    cooperativaId: string;
    cooperativa: string;
    origen: string;
    destino: string;
    terminalOrigen: string;
    terminalDestino: string;
    salida: string;
    unidad: string;
    placa: string;
    servicio: string;
    viajeEstado: string;
  };
  pasajeros: PasajeroAbordaje[];
}

interface DetectorQr {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue?: string }>>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats?: string[] }) => DetectorQr;
  }
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export default function ValidarAbordajePage() {
  const { usuario, cargando } = useAuth();
  const location = useLocation();

  const [codigoEntrada, setCodigoEntrada] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [registrandoId, setRegistrandoId] = useState<string | null>(null);
  const [datos, setDatos] = useState<BoletoAbordaje | null>(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [camaraActiva, setCamaraActiva] = useState(false);

  const solicitudActiva = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const clavesAbordaje = useRef<Map<string, string>>(new Map());

  const detenerCamara = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCamaraActiva(false);
  }, []);

  useEffect(() => () => detenerCamara(), [detenerCamara]);

  const consultarQr = useCallback(async (raw: string) => {
    if (solicitudActiva.current) return;
    setDatos(null);
    setMensaje("");
    const coincidencia = raw.trim().match(UUID);
    if (!coincidencia) {
      setError("Ingresa o escanea un código QR válido de boleto (UUID).");
      return;
    }
    const qrId = coincidencia[0].toLowerCase();
    solicitudActiva.current = true;
    setBuscando(true);
    setError("");
    setMensaje("");
    try {
      const resp = await http<BoletoAbordaje>(`/abordaje/boletos/${encodeURIComponent(qrId)}`);
      setDatos(resp);
      setCodigoEntrada(qrId);
    } catch (e) {
      setDatos(null);
      setError(e instanceof Error ? e.message : "No se pudo consultar el boleto.");
    } finally {
      solicitudActiva.current = false;
      setBuscando(false);
    }
  }, []);

  useEffect(() => {
    if (!camaraActiva) return;
    let cancelado = false;
    let temporizador: number | undefined;

    async function iniciarEscaneo() {
      if (!navigator.mediaDevices?.getUserMedia || !window.BarcodeDetector) {
        setError("Este navegador no admite lectura QR directa por cámara. Usa un escáner USB o pega el UUID.");
        detenerCamara();
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelado) {
          for (const t of stream.getTracks()) t.stop();
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        const detectar = async () => {
          if (cancelado || !videoRef.current) return;
          try {
            if (videoRef.current.readyState >= 2) {
              const encontrados = await detector.detect(videoRef.current);
              const raw = encontrados[0]?.rawValue?.trim();
              if (!cancelado && raw && UUID.test(raw)) {
                detenerCamara();
                void consultarQr(raw);
                return;
              }
            }
          } catch {
            // Reintentar en el siguiente ciclo.
          }
          temporizador = window.setTimeout(() => void detectar(), 350);
        };
        temporizador = window.setTimeout(() => void detectar(), 350);
      } catch {
        setError("No se pudo acceder a la cámara. Concede permiso o usa el ingreso manual del código QR.");
        detenerCamara();
      }
    }

    void iniciarEscaneo();
    return () => {
      cancelado = true;
      if (temporizador !== undefined) window.clearTimeout(temporizador);
      detenerCamara();
    };
  }, [camaraActiva, consultarQr, detenerCamara]);

  async function confirmarAbordaje(reservaAsientoId: string) {
    if (!datos || solicitudActiva.current) return;
    let clave = clavesAbordaje.current.get(reservaAsientoId);
    if (!clave) {
      clave = crypto.randomUUID();
      clavesAbordaje.current.set(reservaAsientoId, clave);
    }
    detenerCamara();
    solicitudActiva.current = true;
    setRegistrandoId(reservaAsientoId);
    setError("");
    setMensaje("");
    try {
      const resp = await http<{ abordajeId: string; boleto: BoletoAbordaje; mensaje: string }>("/abordaje/registrar", {
        method: "POST",
        body: JSON.stringify({
          qrId: datos.boleto.qrId,
          reservaAsientoId,
          clave,
        }),
      });
      setDatos(resp.boleto);
      setMensaje(resp.mensaje || "Abordaje registrado correctamente.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el abordaje.");
    } finally {
      solicitudActiva.current = false;
      setRegistrandoId(null);
    }
  }

  if (cargando) {
    return (
      <section className="mx-auto my-8 max-w-3xl rounded-lg bg-white p-6 text-blue-950">
        <p role="status">Verificando permisos de abordaje…</p>
      </section>
    );
  }

  if (!usuario) {
    return <Navigate to="/iniciar-sesion" state={{ from: location }} replace />;
  }

  if (!accesoPanel("abordaje", usuario.roles, usuario.permisos)) {
    return (
      <section className="mx-auto my-8 max-w-2xl rounded-lg bg-white p-6 text-blue-950 shadow-sm">
        <h1 className="text-2xl font-bold">Acceso restringido</h1>
        <p className="mt-2 text-sm text-slate-700">
          Esta sección es exclusiva para personal de abordaje o administradores autorizados de la cooperativa.
        </p>
        <Link className="mt-4 inline-block text-blue-700 underline" to={destinoTrasLogin(null, usuario.roles).pathname}>
          Volver a mi inicio
        </Link>
      </section>
    );
  }

  const boletoHabilitado =
    datos &&
    datos.boleto.estado === "LISTO" &&
    datos.compra.estado === "CONFIRMADA" &&
    ["PUBLICADO", "EN_RUTA"].includes(datos.compra.viajeEstado);

  return (
    <section className="mx-auto my-6 w-[calc(100%-24px)] max-w-4xl space-y-5 rounded-xl border border-blue-100 bg-white p-5 text-[#08035b] shadow-sm sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Validación de abordaje por QR</h1>
          <p className="mt-1 text-sm text-slate-600">
            Escanea el QR del boleto PDF o del pase en Google Wallet para verificar y confirmar el ingreso al bus.
          </p>
        </div>
        <button
          type="button"
          onClick={() => (camaraActiva ? detenerCamara() : setCamaraActiva(true))}
          className={`min-h-11 rounded-md px-4 py-2 text-sm font-semibold text-white transition ${
            camaraActiva ? "bg-slate-700 hover:bg-slate-800" : "bg-[#08064e] hover:bg-[#101070]"
          }`}
        >
          {camaraActiva ? "Detener cámara" : "Escanear QR con cámara"}
        </button>
      </header>

      {camaraActiva && (
        <div className="overflow-hidden rounded-lg border border-blue-200 bg-black">
          <video ref={videoRef} playsInline muted className="mx-auto max-h-72 w-full object-contain" />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void consultarQr(codigoEntrada);
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <label className="sr-only" htmlFor="qr-input">
          Código QR del boleto
        </label>
        <input
          id="qr-input"
          type="text"
          value={codigoEntrada}
          onChange={(e) => setCodigoEntrada(e.target.value)}
          placeholder="Pega el UUID del boleto o escanea con lector USB…"
          className="min-h-11 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none"
        />
        <button
          type="submit"
          disabled={buscando || registrandoId !== null}
          className="min-h-11 rounded-md bg-[#CB102E] px-5 py-2 text-sm font-semibold text-white hover:bg-[#a60c25] disabled:opacity-60"
        >
          {buscando ? "Consultando…" : "Consultar boleto"}
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {mensaje && (
        <p role="status" className="rounded-md bg-green-50 p-3 text-sm font-medium text-green-800">
          {mensaje}
        </p>
      )}

      {datos && (
        <div className="space-y-4 rounded-lg border border-blue-100 bg-blue-50/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                {datos.compra.cooperativa} · Código {datos.compra.codigo}
              </p>
              <h2 className="text-lg font-bold">
                {datos.compra.origen} → {datos.compra.destino}
              </h2>
              <p className="text-sm text-slate-600">
                {datos.compra.terminalOrigen} → {datos.compra.terminalDestino} ·{" "}
                {new Date(datos.compra.salida).toLocaleString("es-EC", {
                  timeZone: "America/Guayaquil",
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Unidad {datos.compra.unidad} · Placa {datos.compra.placa} · Servicio {datos.compra.servicio}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span
                className={`rounded-full px-3 py-1 ${
                  datos.boleto.estado === "LISTO" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                }`}
              >
                Boleto: {datos.boleto.estado}
              </span>
              <span
                className={`rounded-full px-3 py-1 ${
                  datos.compra.estado === "CONFIRMADA" ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"
                }`}
              >
                Compra: {datos.compra.estado}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {datos.pasajeros.map((p) => {
              const habilitadoPasajero = Boolean(boletoHabilitado && p.estadoAsiento === "CONFIRMADO" && !p.abordado);
              return (
                <article
                  key={p.reservaAsientoId}
                  className="flex flex-col justify-between gap-3 rounded-lg border border-blue-100 bg-white p-3 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-semibold">
                      Asiento {p.asiento} (Piso {p.piso}) · {p.nombre}
                    </p>
                    <p className="text-xs text-slate-600">
                      {p.tipoDocumento} {p.documento} · {p.categoria} · Estado asiento: {p.estadoAsiento}
                    </p>
                    {p.abordado && p.escaneadoAt && (
                      <p className="mt-1 text-xs font-medium text-green-700">
                        Abordado el{" "}
                        {new Date(p.escaneadoAt).toLocaleString("es-EC", {
                          timeZone: "America/Guayaquil",
                          timeStyle: "short",
                          dateStyle: "short",
                        })}
                        {p.operador ? ` por ${p.operador}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {p.abordado ? (
                      <span className="inline-flex rounded-md bg-green-100 px-3 py-1.5 text-xs font-bold text-green-800">
                        Abordaje confirmado
                      </span>
                    ) : p.estadoAsiento !== "CONFIRMADO" ? (
                      <span className="inline-flex rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                        No vigente ({p.estadoAsiento})
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!habilitadoPasajero || buscando || registrandoId !== null}
                        onClick={() => void confirmarAbordaje(p.reservaAsientoId)}
                        className="min-h-10 rounded-md bg-[#00833E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#006b32] disabled:opacity-50"
                      >
                        {registrandoId === p.reservaAsientoId ? "Confirmando…" : "Confirmar abordaje"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
