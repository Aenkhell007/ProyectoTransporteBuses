import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  botonPrimario,
  celdaTabla,
  encabezadoTabla,
  entrada,
  etiquetaCampo,
  subtitulo,
  tabla,
  tarjeta,
  textoError,
  titulo,
} from '../../components/flota/estilos';
import { busesMock } from '../../mocks/buses';
import { indisponibilidadesMock } from '../../mocks/indisponibilidades';
import type { Indisponibilidad, IndisponibilidadForm } from '../../types/indisponibilidad';
import { aIso, busesDisponibles, validarIndisponibilidad } from '../../utils/indisponibilidad';
import type { ErroresIndisponibilidad } from '../../utils/indisponibilidad';

const VACIO: IndisponibilidadForm = { desde: '', hasta: '', motivo: '' };

function formatear(iso: string) {
  return new Date(iso).toLocaleString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function IndisponibilidadesPage() {
  const buses = busesMock.filter((b) => b.activo);
  const [busId, setBusId] = useState(buses[0]?.id ?? '');
  const [lista, setLista] = useState<Indisponibilidad[]>(indisponibilidadesMock);
  const [datos, setDatos] = useState<IndisponibilidadForm>(VACIO);
  const [errores, setErrores] = useState<ErroresIndisponibilidad>({});
  const [consulta, setConsulta] = useState({ desde: '', hasta: '' });

  const delBus = lista.filter((i) => i.bus_id === busId);

  const registrar = (evento: FormEvent) => {
    evento.preventDefault();
    const encontrados = validarIndisponibilidad(datos);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0 || !busId) return;
    setLista((anteriores) => [
      ...anteriores,
      {
        id: crypto.randomUUID(),
        bus_id: busId,
        desde: aIso(datos.desde),
        hasta: aIso(datos.hasta),
        motivo: datos.motivo.trim(),
      },
    ]);
    setDatos(VACIO);
  };

  const consultaValida =
    consulta.desde !== '' &&
    consulta.hasta !== '' &&
    Date.parse(aIso(consulta.hasta)) > Date.parse(aIso(consulta.desde));

  const disponibles = useMemo(
    () =>
      consultaValida
        ? busesDisponibles(busesMock, lista, aIso(consulta.desde), aIso(consulta.hasta))
        : [],
    [consultaValida, consulta, lista],
  );

  return (
    <div className={tarjeta}>
      <h2 className={titulo}>Indisponibilidad de buses (datos simulados)</h2>

      <h3 className={subtitulo}>Registrar un período</h3>
      <label className={`${etiquetaCampo} max-w-sm`}>
        Bus
        <select className={entrada} value={busId} onChange={(e) => setBusId(e.target.value)}>
          {buses.map((b) => (
            <option key={b.id} value={b.id}>
              Unidad {b.unidad} · {b.placa}
            </option>
          ))}
        </select>
      </label>
      <form className="mt-3 grid gap-3 sm:grid-cols-3" onSubmit={registrar} noValidate>
        <label className={etiquetaCampo}>
          Desde *
          <input
            type="datetime-local"
            className={entrada}
            value={datos.desde}
            aria-invalid={Boolean(errores.desde)}
            onChange={(e) => setDatos({ ...datos, desde: e.target.value })}
          />
          {errores.desde && (
            <span className={textoError} role="alert">
              {errores.desde}
            </span>
          )}
        </label>
        <label className={etiquetaCampo}>
          Hasta *
          <input
            type="datetime-local"
            className={entrada}
            value={datos.hasta}
            aria-invalid={Boolean(errores.hasta)}
            onChange={(e) => setDatos({ ...datos, hasta: e.target.value })}
          />
          {errores.hasta && (
            <span className={textoError} role="alert">
              {errores.hasta}
            </span>
          )}
        </label>
        <label className={etiquetaCampo}>
          Motivo *
          <input
            className={entrada}
            value={datos.motivo}
            aria-invalid={Boolean(errores.motivo)}
            onChange={(e) => setDatos({ ...datos, motivo: e.target.value })}
          />
          {errores.motivo && (
            <span className={textoError} role="alert">
              {errores.motivo}
            </span>
          )}
        </label>
        <div className="sm:col-span-3">
          <button type="submit" className={botonPrimario}>
            Registrar
          </button>
        </div>
      </form>

      <div className="mt-4 overflow-x-auto">
        <table className={tabla}>
          <thead>
            <tr>
              <th className={encabezadoTabla}>Desde</th>
              <th className={encabezadoTabla}>Hasta</th>
              <th className={encabezadoTabla}>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {delBus.map((i) => (
              <tr key={i.id}>
                <td className={celdaTabla}>{formatear(i.desde)}</td>
                <td className={celdaTabla}>{formatear(i.hasta)}</td>
                <td className={celdaTabla}>{i.motivo}</td>
              </tr>
            ))}
            {delBus.length === 0 && (
              <tr>
                <td className={celdaTabla} colSpan={3}>
                  Este bus no tiene períodos de indisponibilidad.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h3 className={subtitulo}>Buses disponibles en un rango</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={etiquetaCampo}>
          Desde
          <input
            type="datetime-local"
            className={entrada}
            value={consulta.desde}
            onChange={(e) => setConsulta({ ...consulta, desde: e.target.value })}
          />
        </label>
        <label className={etiquetaCampo}>
          Hasta
          <input
            type="datetime-local"
            className={entrada}
            value={consulta.hasta}
            onChange={(e) => setConsulta({ ...consulta, hasta: e.target.value })}
          />
        </label>
      </div>
      {consulta.desde !== '' && consulta.hasta !== '' && !consultaValida && (
        <p className={`${textoError} mt-2`} role="alert">
          La fecha final debe ser posterior a la inicial.
        </p>
      )}
      {consultaValida && (
        <ul className="mt-3 list-disc pl-6 text-sm text-slate-800">
          {disponibles.map((b) => (
            <li key={b.id}>
              Unidad {b.unidad} · {b.placa}
            </li>
          ))}
          {disponibles.length === 0 && <li>Ningún bus disponible en ese rango.</li>}
        </ul>
      )}
    </div>
  );
}