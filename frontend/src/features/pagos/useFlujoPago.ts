import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { pagosApi, ErrorPagoApi, enlaceArchivo, enlaceQr } from "./pagosApi";
import type { DatosPago } from "./pagosApi";

export function useFlujoPago() {
  const [params] = useSearchParams();
  const valor = params.get("reserva_id");
  const reservaId =
    valor &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      valor,
    )
      ? valor
      : null;
  const [estado, setEstado] = useState<{
    id: string | null;
    datos: DatosPago | null;
    error: string;
    status: number;
    cargando: boolean;
  }>({ id: null, datos: null, error: "", status: 0, cargando: true });
  const cargar = useCallback(
    async (signal?: AbortSignal) => {
      if (!reservaId) {
        setEstado({
          id: null,
          datos: null,
          error:
            "Abre el pago desde una reserva válida en el resumen de tu viaje.",
          status: 422,
          cargando: false,
        });
        return;
      }
      try {
        const datos = await pagosApi.consultar(reservaId, signal);
        if (!signal?.aborted)
          setEstado({
            id: reservaId,
            datos,
            error: "",
            status: 0,
            cargando: false,
          });
      } catch (e) {
        if (signal?.aborted) return;
        const status = e instanceof ErrorPagoApi ? e.status : 0;
        setEstado((anterior) => ({
          id: reservaId,
          datos: [401, 403, 404].includes(status)
            ? null
            : anterior.id === reservaId
              ? anterior.datos
              : null,
          error:
            e instanceof Error ? e.message : "No se pudo consultar el pago.",
          status,
          cargando: false,
        }));
      }
    },
    [reservaId],
  );
  useEffect(() => {
    const abortar = new AbortController();
    void cargar(abortar.signal);
    const reloj = setInterval(() => {
      if (document.visibilityState === "visible") void cargar(abortar.signal);
    }, 15000);
    return () => {
      abortar.abort();
      clearInterval(reloj);
    };
  }, [cargar]);
  const datos = estado.id === reservaId ? estado.datos : null;
  const cuentas =
    datos?.cuentas.map((c) => ({
      ...c,
      qrSrc: c.qrArchivoId
        ? enlaceArchivo(reservaId!, c.qrArchivoId, true)
        : undefined,
    })) ?? [];
  const snapshot = datos?.intento?.cuentaSnapshot;
  if (
    datos?.intento?.cuentaId &&
    snapshot &&
    ["PENDIENTE", "EN_REVISION", "APROBADO"].includes(datos.intento.estado)
  ) {
    const i = cuentas.findIndex((c) => c.id === datos.intento!.cuentaId),
      actual = cuentas[i];
    const cuenta = {
      id: datos.intento.cuentaId,
      banco: actual?.banco ?? "Cuenta receptora del intento",
      tipo: snapshot.tipo,
      numero: snapshot.numero,
      titular: snapshot.titular,
      ruc: snapshot.documento_titular,
      qrArchivoId: actual?.qrArchivoId ?? null,
      qrSrc: actual?.qrSrc,
    };
    if (i < 0) cuentas.push(cuenta);
    else cuentas[i] = cuenta;
  }
  const cancelada =
    datos &&
    (datos.compra?.estado === "CANCELADA" ||
      datos.compra?.estado === "REEMBOLSADA" ||
      datos.reserva.estado === "CANCELADA");
  const vencida =
    datos &&
    (datos.reserva.estado === "VENCIDA" ||
      (datos.reserva.estado === "PENDIENTE" &&
        Date.parse(datos.reserva.expires_at) <= Date.now()));
  const flujo = datos
    ? {
        estado:
          datos.compra?.estado === "CONFIRMADA"
            ? ("aprobado" as const)
            : cancelada
              ? ("cancelada" as const)
              : vencida
                ? ("vencida" as const)
                : datos.intento?.estado === "RECHAZADO"
                  ? ("rechazado" as const)
                  : datos.intento?.estado === "EN_REVISION"
                    ? ("revision" as const)
                    : ("seleccion" as const),
        cuentaId: datos.intento?.cuentaId ?? null,
        documentoDisponible:
          datos.compra?.estado === "CONFIRMADA" &&
          datos.documento?.estado === "LISTO" &&
          !!datos.documento.archivoId,
        motivoRechazo: datos.comprobante?.motivo ?? "",
        comprobante: datos.comprobante
          ? {
              ...datos.comprobante,
              montoCentavos:
                datos.intento?.totalCentavos ?? datos.reserva.total_centavos,
            }
          : null,
      }
    : null;
  const fecha = (valor: string) =>
    new Intl.DateTimeFormat("es-EC", {
      dateStyle: "full",
      timeZone: "America/Guayaquil",
    }).format(new Date(valor));
  const hora = (valor: string) =>
    new Intl.DateTimeFormat("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "America/Guayaquil",
    }).format(new Date(valor));
  const compra = datos
    ? {
        ...datos.viaje,
        codigo: datos.compra?.codigo ?? datos.reserva.id,
        fecha: fecha(datos.viaje.salida),
        salida: hora(datos.viaje.salida),
        llegada: hora(datos.viaje.llegada),
        duracion: `${Math.floor((Date.parse(datos.viaje.llegada) - Date.parse(datos.viaje.salida)) / 3600000)}h ${Math.round(((Date.parse(datos.viaje.llegada) - Date.parse(datos.viaje.salida)) % 3600000) / 60000)}min`,
        piso: [...new Set(datos.pasajeros.map((p) => p.piso))]
          .map((p) => `Piso ${p}`)
          .join(", "),
        metodo: datos.intento?.metodo ?? "",
        pasajeros: datos.pasajeros,
        servicioCentavos: datos.cotizacion?.servicio_centavos ?? 0,
        ivaCentavos: datos.cotizacion?.iva_centavos ?? 0,
        pdfVista: datos.documento?.archivoId
          ? enlaceArchivo(reservaId!, datos.documento.archivoId, true)
          : "",
        pdf: datos.documento?.archivoId
          ? enlaceArchivo(reservaId!, datos.documento.archivoId)
          : "",
        qr: enlaceQr(reservaId!),
      }
    : null;
  return {
    reservaId,
    datos,
    cuentas,
    compra,
    flujo,
    cargando: estado.id !== reservaId ? !!reservaId : estado.cargando,
    error: estado.error,
    status: estado.status,
    recargar: cargar,
  };
}
