import { Icono, type NombreIcono } from "../../components/compra/Icono";
import "./oficina.css";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { http, leerHttpCache } from "../../services/http";
import { CargaSeccion, useMostrarCarga } from "../../components/ui/CargaSeccion";
export const dinero = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );
export const fechaHora = (v: string) =>
  new Date(v).toLocaleString("es-EC", {
    timeZone: "America/Guayaquil",
    dateStyle: "medium",
    timeStyle: "short",
  });
export const boton =
  "of-boton inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed";
export const primario =
  boton + " bg-[#ff0018] text-white border-[#ff0018] hover:bg-red-700";
export const campo =
  "of-campo min-h-11 w-full rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm text-[#0b1248] focus:outline-2 focus:outline-blue-500";
export function Tarjeta({
  titulo,
  children,
}: {
  titulo?: string;
  children: ReactNode;
}) {
  return (
    <section className="of-tarjeta min-w-0 rounded-lg border border-blue-100 bg-white p-4 sm:p-5">
      {titulo && (
        <h2 className="of-titulo-tarjeta"><Icono nombre={iconoPara(titulo)} className="size-7" />{titulo}</h2>
      )}
      {children}
    </section>
  );
}
export function Aviso({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md bg-blue-50 p-3 text-sm text-blue-900">
      {children}
    </p>
  );
}
export function etiquetaEstado(valor: string) {
 const nombres: Record<string,string> = { EN_REVISION: "En revisión", APROBADO: "Aprobado", RECHAZADO: "Rechazado", CONFIRMADA: "Confirmada", PENDIENTE: "Pendiente", VENCIDA: "Vencida", CANCELADA: "Cancelada", SOLICITADO: "Solicitado", EJECUTADO: "Completado" };
 return nombres[valor] ?? valor;
}
export function iconoPara(nombre: string): NombreIcono {
 if (/asiento/i.test(nombre)) return "asiento";
 if (/venta|pagado|cobro|monto/i.test(nombre)) return "dinero";
 if (/oficina/i.test(nombre)) return "oficina";
 if (/bus|salida|viaje|compra/i.test(nombre)) return "bus";
 if (/confirm|aprobad|complet/i.test(nombre)) return "checkCirculo";
 if (/rechaz|vencid/i.test(nombre)) return "xCirculo";
 if (/revisi|historial/i.test(nombre)) return "reloj";
 if (/reserva/i.test(nombre)) return "calendario";
 if (/usuarios registrados/i.test(nombre)) return "persona";
 if (/usuario|pasajero|cooperativa/i.test(nombre)) return "personas";
 if (/comprador/i.test(nombre)) return "persona";
 return "documento";
}
export function Estado({valor}: {valor: string}) {
 const color=/aprob|confirm|pagad|ejecut|complet/i.test(valor) ? "verde" : /rechaz|venc|cancel/i.test(valor) ? "rojo" : "ambar";
 return <span className={"of-estado of-estado--"+color}><span aria-hidden="true" />{etiquetaEstado(valor)}</span>;
}
export function Indicadores({items}: {items: {nombre: string; valor: string|number; color?: "verde" | "azul" | "ambar" | "violeta" | "rojo"}[]}) {
 return <div className="of-indicadores">{items.map(i=>{
 const color=i.color ?? (/rechaz|vencid/i.test(i.nombre) ? "rojo" : /pendiente|solicitad|revisi/i.test(i.nombre) ? "ambar" : /reservas confirmadas/i.test(i.nombre) ? "violeta" : /venta|aprobad|complet|cooperativa/i.test(i.nombre) ? "verde" : i.nombre === "Total comprobantes" ? "verde" : i.nombre === "Oficinas" ? "violeta" : i.nombre === "Confirmada" ? "verde" : "azul");
 return <div key={i.nombre} className="of-indicador"><span className={"of-icono of-icono--"+color}><Icono nombre={iconoPara(i.nombre)} className="size-8" /></span><div><p>{i.nombre}</p><strong>{i.valor}</strong></div></div>;
 })}</div>;
}
export function useConsulta<T>(ruta: string, activo = true) {
  const inicial = activo ? leerHttpCache<T>(ruta) : null;
  const [datos, setDatos] = useState<T | null>(inicial);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(activo && !inicial);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!activo) {
      setCargando(false);
      return;
    }
    const c = new AbortController();
    const enCache = version === 0 ? leerHttpCache<T>(ruta) : null;
    if (enCache) {
      setDatos(enCache);
      setCargando(false);
    } else if (!datos) {
      setCargando(true);
    }
    setError("");
    http<T>(ruta, { signal: c.signal })
      .then((d) => {
        if (!c.signal.aborted) setDatos(d);
      })
      .catch((e) => {
        if (!c.signal.aborted)
          setError(e instanceof Error ? e.message : "No se pudo consultar.");
      })
      .finally(() => {
        if (!c.signal.aborted) setCargando(false);
      });
    return () => c.abort();
  }, [ruta, version, activo]);
  return { datos, error, cargando, recargar: () => setVersion((v) => v + 1) };
}
export function ConsultaEstado({
  cargando,
  error,
  recargar,
}: {
  cargando: boolean;
  error: string;
  recargar: () => void;
}) {
  const mostrarSkeleton = useMostrarCarga(cargando && !error, 250);
  if (mostrarSkeleton) return <CargaSeccion />;
  if (!error) return null;
  return (
    <>
      {cargando && (
        <p role="status" className="py-4">
          Consultando datos…
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-4"
        >
          <p>{error}</p>
          <button className={boton + " mt-3"} onClick={recargar}>
            Reintentar
          </button>
        </div>
      )}
    </>
  );
}

export function Dialogo({
  titulo,
  cerrar,
  textoCerrar = 'Cerrar detalle',
  children,
}: {
  titulo: string;
  cerrar: () => void;
  textoCerrar?: string;
  children: ReactNode;
}) {
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    caja.current?.querySelector<HTMLElement>("button")?.focus();
    return () => anterior?.focus();
  }, []);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) cerrar();
      }}
    >
      <div
        ref={caja}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-6"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            cerrar();
          }
          if (e.key === "Tab") {
            const items = caja.current?.querySelectorAll<HTMLElement>(
              'button,a[href],input,select,textarea,[tabindex="0"]',
            );
            if (!items?.length) return;
            const primero = items[0],
              ultimo = items[items.length - 1];
            if (e.shiftKey && document.activeElement === primero) {
              e.preventDefault();
              ultimo.focus();
            } else if (!e.shiftKey && document.activeElement === ultimo) {
              e.preventDefault();
              primero.focus();
            }
          }
        }}
      >
        <button type="button" className={boton} onClick={cerrar}>
          {textoCerrar}
        </button>
        <h2 className="my-4 text-xl font-bold">{titulo}</h2>
        {children}
      </div>
    </div>
  );
}
