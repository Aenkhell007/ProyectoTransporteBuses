import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { busesMock } from '../../mocks/buses';
import { indisponibilidadesMock } from '../../mocks/indisponibilidades';
import type { Indisponibilidad, IndisponibilidadForm } from '../../types/indisponibilidad';
import { aIso, busesDisponibles, validarIndisponibilidad } from '../../utils/indisponibilidad';
import type { ErroresIndisponibilidad } from '../../utils/indisponibilidad';
import './buses.css';

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
    <div className="buses-page">
      <h2>Indisponibilidad de buses (datos simulados)</h2>

      <h3>Registrar un período</h3>
      <label className="bus-form__campo">
        Bus
        <select value={busId} onChange={(e) => setBusId(e.target.value)}>
          {buses.map((b) => (
            <option key={b.id} value={b.id}>
              Unidad {b.unidad} · {b.placa}
            </option>
          ))}
        </select>
      </label>
      <form className="bus-form" onSubmit={registrar} noValidate>
        <label className="bus-form__campo">
          Desde *
          <input
            type="datetime-local"
            value={datos.desde}
            onChange={(e) => setDatos({ ...datos, desde: e.target.value })}
          />
          {errores.desde && <span className="bus-form__error">{errores.desde}</span>}
        </label>
        <label className="bus-form__campo">
          Hasta *
          <input
            type="datetime-local"
            value={datos.hasta}
            onChange={(e) => setDatos({ ...datos, hasta: e.target.value })}
          />
          {errores.hasta && <span className="bus-form__error">{errores.hasta}</span>}
        </label>
        <label className="bus-form__campo">
          Motivo *
          <input
            value={datos.motivo}
            onChange={(e) => setDatos({ ...datos, motivo: e.target.value })}
          />
          {errores.motivo && <span className="bus-form__error">{errores.motivo}</span>}
        </label>
        <button type="submit">Registrar</button>
      </form>

      <table className="buses-page__tabla">
        <thead>
          <tr>
            <th>Desde</th>
            <th>Hasta</th>
            <th>Motivo</th>
          </tr>
        </thead>
        <tbody>
          {delBus.map((i) => (
            <tr key={i.id}>
              <td>{formatear(i.desde)}</td>
              <td>{formatear(i.hasta)}</td>
              <td>{i.motivo}</td>
            </tr>
          ))}
          {delBus.length === 0 && (
            <tr>
              <td colSpan={3}>Este bus no tiene períodos de indisponibilidad.</td>
            </tr>
          )}
        </tbody>
      </table>

      <h3>Buses disponibles en un rango</h3>
      <div className="bus-form">
        <label className="bus-form__campo">
          Desde
          <input
            type="datetime-local"
            value={consulta.desde}
            onChange={(e) => setConsulta({ ...consulta, desde: e.target.value })}
          />
        </label>
        <label className="bus-form__campo">
          Hasta
          <input
            type="datetime-local"
            value={consulta.hasta}
            onChange={(e) => setConsulta({ ...consulta, hasta: e.target.value })}
          />
        </label>
      </div>
      {consulta.desde !== '' && consulta.hasta !== '' && !consultaValida && (
        <p className="bus-form__error">La fecha final debe ser posterior a la inicial.</p>
      )}
      {consultaValida && (
        <ul>
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