import { useEffect, useMemo, useState } from 'react';
import { guardarOperacion, sumarDias, type Asignacion, type Viaje } from './api';
import {
  useOperacion,
  Titulo,
  Caja,
  Campo,
  SelectorAmbito,
  Mensajes,
  Aviso,
  Icono,
  campo,
  boton,
  primario,
} from './ui';

const GRUPO_TODOS = 'TODOS';

const etiqueta = (dia: string) =>
  new Date(dia + 'T12:00Z').toLocaleDateString('es-EC', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

const claveCelda = (fecha: string, frecuenciaId: string) => `${fecha}::${frecuenciaId}`;

export default function HojaRutaGestion() {
  const a = useOperacion(6, 'planificacion');
  const d = a.datos;
  const [grupo, setGrupo] = useState(GRUPO_TODOS);
  const [borradorCeldas, setBorradorCeldas] = useState<Record<string, string>>({});
  const [paradasDia, setParadasDia] = useState<Record<string, string[]>>({});
  const [avisos, setAvisos] = useState<string[]>([]);
  const [diaMovil, setDiaMovil] = useState(a.desde);
  const [accionEnCurso, setAccionEnCurso] = useState<null | 'generar' | 'guardar' | 'publicar'>(null);

  useEffect(() => {
    setBorradorCeldas({});
    setParadasDia({});
    setAvisos([]);
    setDiaMovil(a.desde);
  }, [d?.cooperativa.id, a.desde, a.hasta]);

  useEffect(() => {
    if (!d) return;
    setGrupo((actual) => {
      if (actual === GRUPO_TODOS) return GRUPO_TODOS;
      if (actual && d.grupos.some((g) => g.id === actual)) return actual;
      return GRUPO_TODOS;
    });
  }, [d]);

  const esTodos = grupo === GRUPO_TODOS;

  const nombreGrupoPorId = useMemo(
    () => new Map((d?.grupos ?? []).map((g) => [g.id, g.nombre])),
    [d?.grupos],
  );

  const dias = useMemo(
    () =>
      Array.from(
        { length: Math.min(31, Math.max(0, (Date.parse(a.hasta) - Date.parse(a.desde)) / 86400000 + 1)) },
        (_, i) => sumarDias(a.desde, i),
      ),
    [a.desde, a.hasta],
  );

  const busesGrupo = useMemo(
    () =>
      (d?.buses ?? [])
        .filter((b) => b.activo && b.plano_id && (esTodos || !grupo || b.grupo_id === grupo))
        .sort((x, y) => x.unidad.localeCompare(y.unidad, 'es', { numeric: true })),
    [d?.buses, grupo, esTodos],
  );

  const frecuenciasGrupo = useMemo(
    () =>
      (d?.frecuencias ?? [])
        .filter((f) => f.activa && (esTodos || !grupo || f.grupos.includes(grupo)))
        .sort((x, y) => x.hora.localeCompare(y.hora) || x.codigo.localeCompare(y.codigo)),
    [d?.frecuencias, grupo, esTodos],
  );

  const actualesPorCelda = useMemo(() => {
    const mapa = new Map<string, Viaje>();
    for (const v of d?.viajes ?? []) {
      if (v.estado !== 'CANCELADO') {
        mapa.set(claveCelda(v.fecha, v.frecuencia_id), v);
      }
    }
    return mapa;
  }, [d?.viajes]);

  const F = frecuenciasGrupo.length;
  const B = busesGrupo.length;
  const minimoBuses = F + 2;
  const cumpleMinimo = Boolean(grupo) && F > 0 && B >= minimoBuses;
  const numParadas = Math.max(2, B - F);

  function busEnCelda(fecha: string, freqId: string): string {
    const k = claveCelda(fecha, freqId);
    if (k in borradorCeldas) return borradorCeldas[k];
    return actualesPorCelda.get(k)?.bus_id ?? '';
  }

  function esPublicado(fecha: string, freqId: string): boolean {
    return actualesPorCelda.get(claveCelda(fecha, freqId))?.estado === 'PUBLICADO';
  }

  function paradasDelDia(fecha: string): string[] {
    const usadas = new Set(frecuenciasGrupo.map((f) => busEnCelda(fecha, f.id)).filter(Boolean));
    const libres = busesGrupo.map((b) => b.id).filter((id) => !usadas.has(id));
    const ordenPrevio = (paradasDia[fecha] ?? []).filter((id) => !usadas.has(id) && libres.includes(id));
    const restantes = libres.filter((id) => !ordenPrevio.includes(id));
    return [...ordenPrevio, ...restantes];
  }

  function cambiarBusFrecuencia(fecha: string, freqId: string, nuevoBusId: string) {
    a.setError('');
    if (esPublicado(fecha, freqId)) return;
    if (!nuevoBusId && actualesPorCelda.has(claveCelda(fecha, freqId))) return;
    const actualBusId = busEnCelda(fecha, freqId);
    if (actualBusId === nuevoBusId) return;

    const otraFreq = nuevoBusId
      ? frecuenciasGrupo.find((f) => f.id !== freqId && busEnCelda(fecha, f.id) === nuevoBusId)
      : undefined;

    if (otraFreq && esPublicado(fecha, otraFreq.id)) {
      a.setError('Ese bus ya cubre una salida publicada en esta misma fecha.');
      return;
    }

    const stopsActuales = paradasDelDia(fecha);
    const reemplazo = actualBusId || stopsActuales.find((id) => id !== nuevoBusId) || '';
    if (otraFreq && actualesPorCelda.has(claveCelda(fecha, otraFreq.id)) && !reemplazo) {
      a.setError('No hay otro bus disponible para intercambiar en esta fecha.');
      return;
    }

    setBorradorCeldas((prev) => {
      const next = { ...prev, [claveCelda(fecha, freqId)]: nuevoBusId };
      if (otraFreq) {
        next[claveCelda(fecha, otraFreq.id)] = reemplazo;
      }
      return next;
    });

    setParadasDia((prev) => {
      const base = prev[fecha] ?? stopsActuales;
      if (otraFreq) {
        if (!actualBusId && reemplazo && base.includes(reemplazo)) {
          return { ...prev, [fecha]: base.filter((id) => id !== reemplazo) };
        }
        return prev;
      }
      if (nuevoBusId && base.includes(nuevoBusId)) {
        return {
          ...prev,
          [fecha]: base.map((id) => (id === nuevoBusId ? actualBusId : id)).filter(Boolean),
        };
      }
      return prev;
    });
  }

  function cambiarBusParada(fecha: string, idxParada: number, nuevoBusId: string) {
    a.setError('');
    const stops = paradasDelDia(fecha);
    const busSaliente = stops[idxParada] ?? '';
    if (busSaliente === nuevoBusId) return;

    const freqConNuevoBus = nuevoBusId
      ? frecuenciasGrupo.find((f) => busEnCelda(fecha, f.id) === nuevoBusId)
      : undefined;

    if (freqConNuevoBus) {
      if (esPublicado(fecha, freqConNuevoBus.id)) {
        a.setError('No puedes mover a parada un bus con salida ya publicada ese día.');
        return;
      }
      const reemplazo =
        busSaliente || stops.find((id, idx) => idx !== idxParada && id && id !== nuevoBusId) || '';
      if (actualesPorCelda.has(claveCelda(fecha, freqConNuevoBus.id)) && !reemplazo) {
        a.setError('No hay un bus disponible para reemplazar la salida en borrador.');
        return;
      }
      setBorradorCeldas((prev) => ({
        ...prev,
        [claveCelda(fecha, freqConNuevoBus.id)]: reemplazo,
      }));
      const siguientes = [...stops];
      if (!busSaliente && reemplazo) {
        const idxReemplazo = siguientes.indexOf(reemplazo);
        if (idxReemplazo >= 0) siguientes[idxReemplazo] = '';
      }
      siguientes[idxParada] = nuevoBusId;
      setParadasDia((prev) => ({ ...prev, [fecha]: siguientes.filter(Boolean) }));
      return;
    }

    const otroIdx = stops.indexOf(nuevoBusId);
    const siguientes = [...stops];
    if (otroIdx >= 0) {
      siguientes[otroIdx] = busSaliente;
    }
    siguientes[idxParada] = nuevoBusId;
    setParadasDia((prev) => ({ ...prev, [fecha]: siguientes.filter(Boolean) }));
  }

  const cambiosPendientes = useMemo(() => {
    const lista: Asignacion[] = [];
    for (const fecha of dias) {
      for (const f of frecuenciasGrupo) {
        const k = claveCelda(fecha, f.id);
        const saved = actualesPorCelda.get(k);
        if (saved?.estado === 'PUBLICADO') continue;
        const buscado = k in borradorCeldas ? borradorCeldas[k] : saved?.bus_id ?? '';
        if (!buscado) continue;
        if (!saved || buscado !== saved.bus_id) {
          lista.push({
            id: saved?.id,
            version: saved?.version,
            fecha,
            frecuenciaId: f.id,
            busId: buscado,
            conductorId: saved?.conductor_id ?? undefined,
          });
        }
      }
    }
    return lista;
  }, [dias, frecuenciasGrupo, actualesPorCelda, borradorCeldas]);

  const borradoresGrupo = useMemo(
    () =>
      (d?.viajes ?? []).filter(
        (v) =>
          v.estado === 'BORRADOR' &&
          frecuenciasGrupo.some((f) => f.id === v.frecuencia_id) &&
          (esTodos || !grupo || d?.buses.find((b) => b.id === v.bus_id)?.grupo_id === grupo),
      ),
    [d?.viajes, d?.buses, frecuenciasGrupo, grupo, esTodos],
  );

  async function generar() {
    if (!d || !grupo || accionEnCurso) return;
    setAccionEnCurso('generar');
    a.setError('');
    a.setMensaje('');
    try {
      const r = await guardarOperacion<{
        propuestas: Asignacion[];
        avisos: string[];
        paradasPorDia?: Record<string, string[]>;
      }>('propuestas', d.cooperativa.id, { desde: a.desde, hasta: a.hasta, grupoId: grupo }, 'POST');

      setBorradorCeldas((prev) => {
        const next = { ...prev };
        for (const p of r.propuestas) {
          const k = claveCelda(p.fecha, p.frecuenciaId);
          if (!esPublicado(p.fecha, p.frecuenciaId)) {
            next[k] = p.busId;
          }
        }
        return next;
      });
      if (r.paradasPorDia) setParadasDia(r.paradasPorDia);
      setAvisos(r.avisos ?? []);
      a.setMensaje(
        r.propuestas.length
          ? `${r.propuestas.length} asignaciones generadas en la matriz. Revisa o ajusta y guarda el borrador.`
          : 'Matriz actualizada con la planificación existente.',
      );
    } catch (e) {
      a.setError(e instanceof Error ? e.message : 'No se pudo generar la propuesta.');
    } finally {
      setAccionEnCurso(null);
    }
  }

  async function guardarBorrador() {
    if (!d || !cambiosPendientes.length || accionEnCurso) return;
    const pendientes = cambiosPendientes;
    const datosPrevios = d;
    const borradorPrevio = borradorCeldas;

    setAccionEnCurso('guardar');
    a.setError('');
    a.setMensaje('');

    // Actualización optimista inmediata en la matriz sin esperar respuesta completa de red.
    a.setDatos((prev) => {
      if (!prev) return prev;
      const viajesSiguientes = [...prev.viajes];
      for (const item of pendientes) {
        const freq = prev.frecuencias.find((f) => f.id === item.frecuenciaId);
        const bus = prev.buses.find((b) => b.id === item.busId);
        const idx = viajesSiguientes.findIndex(
          (v) =>
            (item.id && v.id === item.id) ||
            (v.estado !== 'CANCELADO' && v.fecha === item.fecha && v.frecuencia_id === item.frecuenciaId),
        );
        const optimista: Viaje = {
          id: item.id ?? `temp-${item.fecha}-${item.frecuenciaId}`,
          frecuencia_id: item.frecuenciaId,
          bus_id: item.busId,
          plano_id: bus?.plano_id ?? '',
          conductor_id: item.conductorId ?? null,
          estado: 'BORRADOR',
          version: (item.version ?? 0) + 1,
          salida: `${item.fecha}T${freq?.hora ?? '00:00'}:00-05:00`,
          llegada: `${item.fecha}T${freq?.hora ?? '00:00'}:00-05:00`,
          liberacion_bus: `${item.fecha}T${freq?.hora ?? '00:00'}:00-05:00`,
          fecha: item.fecha,
          hora: freq?.hora ?? '00:00',
        };
        if (idx >= 0) viajesSiguientes[idx] = { ...viajesSiguientes[idx], ...optimista };
        else viajesSiguientes.push(optimista);
      }
      return { ...prev, viajes: viajesSiguientes };
    });
    setBorradorCeldas({});

    try {
      const r = await guardarOperacion<{ ids: string[]; viajes?: Viaje[]; mensaje: string }>(
        'asignaciones',
        d.cooperativa.id,
        { asignaciones: pendientes, permitirMezclaGrupos: esTodos },
      );

      a.setDatos((prev) => {
        if (!prev) return prev;
        const viajesServidor = r.viajes ?? [];
        const limpios = prev.viajes.filter((v) => !v.id.startsWith('temp-'));
        const mapa = new Map(limpios.map((v) => [v.id, v]));
        for (const vs of viajesServidor) {
          for (const [idExistente, vExistente] of mapa) {
            if (
              idExistente !== vs.id &&
              vExistente.estado !== 'CANCELADO' &&
              vExistente.fecha === vs.fecha &&
              vExistente.frecuencia_id === vs.frecuencia_id
            ) {
              mapa.delete(idExistente);
            }
          }
          mapa.set(vs.id, vs);
        }

        const frecuenciasActualizadas =
          esTodos && viajesServidor.length
            ? prev.frecuencias.map((f) => {
                const gruposNuevos = new Set(f.grupos);
                for (const vs of viajesServidor) {
                  if (vs.frecuencia_id === f.id) {
                    const b = prev.buses.find((x) => x.id === vs.bus_id);
                    if (b?.grupo_id) gruposNuevos.add(b.grupo_id);
                  }
                }
                return gruposNuevos.size !== f.grupos.length ? { ...f, grupos: [...gruposNuevos] } : f;
              })
            : prev.frecuencias;

        return {
          ...prev,
          frecuencias: frecuenciasActualizadas,
          viajes: [...mapa.values()].sort((x, y) => x.salida.localeCompare(y.salida)),
        };
      });
      a.setMensaje(r.mensaje);
    } catch (e) {
      a.setDatos(datosPrevios);
      setBorradorCeldas(borradorPrevio);
      a.setError(e instanceof Error ? e.message : 'No se pudo guardar el borrador.');
    } finally {
      setAccionEnCurso(null);
    }
  }

  async function publicarSalidas() {
    if (!d || !borradoresGrupo.length || accionEnCurso) return;
    const objetivos = borradoresGrupo.filter((v) => !v.id.startsWith('temp-'));
    if (!objetivos.length) return;
    const datosPrevios = d;
    const objetivoIds = new Set(objetivos.map((v) => v.id));

    setAccionEnCurso('publicar');
    a.setError('');
    a.setMensaje('');

    // Actualización optimista: refleja al instante el estado Publicada.
    a.setDatos((prev) =>
      prev
        ? {
            ...prev,
            viajes: prev.viajes.map((v) =>
              objetivoIds.has(v.id) ? { ...v, estado: 'PUBLICADO', version: v.version + 1 } : v,
            ),
          }
        : prev,
    );

    try {
      const r = await guardarOperacion<{ viajes?: Viaje[]; mensaje: string }>(
        'publicar',
        d.cooperativa.id,
        { viajes: objetivos.map((v) => ({ id: v.id, version: v.version })) },
        'POST',
      );
      if (r.viajes?.length) {
        const porId = new Map(r.viajes.map((v) => [v.id, v]));
        a.setDatos((prev) =>
          prev
            ? {
                ...prev,
                viajes: prev.viajes.map((v) => porId.get(v.id) ?? v),
              }
            : prev,
        );
      }
      setBorradorCeldas({});
      a.setMensaje(r.mensaje);
    } catch (e) {
      a.setDatos(datosPrevios);
      a.setError(e instanceof Error ? e.message : 'No se pudieron publicar las salidas.');
    } finally {
      setAccionEnCurso(null);
    }
  }

  const labelBus = (busId: string) => {
    const b = busesGrupo.find((x) => x.id === busId);
    if (!b) return busId;
    const gNombre = nombreGrupoPorId.get(b.grupo_id);
    return esTodos && gNombre ? `Bus ${b.unidad} · ${b.placa} (${gNombre})` : `Bus ${b.unidad} · ${b.placa}`;
  };

  return (
    <section className="space-y-3 py-4 text-blue-900">
      <Titulo
        titulo="Hoja de ruta"
        descripcion="Asigna los buses por día con rotación y paradas obligatorias, por grupo individual o combinando toda la flota."
      >
        <SelectorAmbito a={a} />
      </Titulo>
      <Mensajes a={a} />

      <div className="grid items-end gap-3 rounded-lg border border-blue-100 bg-white p-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
        <Campo nombre="Grupo de buses">
          <select
            className={campo}
            value={grupo}
            onChange={(e) => {
              setGrupo(e.target.value);
              setBorradorCeldas({});
              setParadasDia({});
            }}
          >
            <option value={GRUPO_TODOS}>TODOS (Flota completa · Mixto, VIP y Normal)</option>
            {d?.grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre}
                {!g.activo ? ' (Inactivo)' : ''}
              </option>
            ))}
          </select>
        </Campo>
        <Campo nombre="Desde">
          <input type="date" className={campo} value={a.desde} onChange={(e) => a.setDesde(e.target.value)} />
        </Campo>
        <Campo nombre="Hasta">
          <input type="date" className={campo} value={a.hasta} onChange={(e) => a.setHasta(e.target.value)} />
        </Campo>
        <button
          type="button"
          disabled={!d || accionEnCurso !== null || !d.permisos.operacion || !cumpleMinimo}
          className={primario + ' min-h-9'}
          onClick={() => void generar()}
        >
          <Icono nombre="configuracion" />
          {accionEnCurso === 'generar' ? 'Generando…' : 'Generar'}
        </button>
      </div>

      {esTodos && d && F > 0 && B > 0 && (
        <Aviso tipo="info">
          <p>
            Modo <strong>TODOS</strong> activo: puedes combinar y rotar buses <strong>Mixtos, VIP y Normales</strong> dentro de la misma planificación.
          </p>
        </Aviso>
      )}

      {d && grupo && !cumpleMinimo && (
        <Aviso tipo="alerta">
          {F === 0 ? (
            <p>
              {esTodos
                ? 'La cooperativa no tiene frecuencias activas todavía.'
                : 'El grupo seleccionado no tiene frecuencias activas. Selecciona «TODOS» o asigna al menos una frecuencia al grupo primero.'}
            </p>
          ) : (
            <p>
              Se necesitan al menos <strong>{minimoBuses} buses activos con plano</strong>{' '}
              {esTodos ? 'en la flota completa' : 'para este grupo'} ({F}{' '}
              {F === 1 ? 'frecuencia activa' : 'frecuencias activas'} + mínimo 2 paradas obligatorias). Actualmente cuenta con{' '}
              <strong>{B}</strong>.
            </p>
          )}
        </Aviso>
      )}

      {d && (
        <fieldset disabled={accionEnCurso === 'generar' || !d.permisos.operacion} className="min-w-0 space-y-3">
          <Caja
            titulo="Matriz de asignación (Frecuencias + Paradas × Fechas)"
            icono="calendario"
            accion={
              <span className="text-xs text-slate-600">
                Buses: <strong>{B}</strong> · Frecuencias: <strong>{F}</strong> · Paradas/día: <strong>{numParadas}</strong>
              </span>
            }
          >
            {F === 0 ? (
              <p className="p-3 text-sm text-slate-600">No hay frecuencias activas para mostrar en la matriz.</p>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="min-w-52 p-2.5">Frecuencia / Parada</th>
                        {dias.map((dia) => (
                          <th key={dia} className="min-w-44 border-l border-blue-100 p-2.5 text-center capitalize">
                            {etiqueta(dia)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {frecuenciasGrupo.map((f) => (
                        <tr key={f.id} className="border-t border-blue-100">
                          <th className="bg-slate-50/70 p-2.5 align-middle font-normal">
                            <strong className="block text-sm text-[#1002b4]">
                              {f.codigo} · {f.hora}
                            </strong>
                            <span className="block text-xs text-slate-600">{f.ruta}</span>
                            {esTodos && f.grupos.length > 0 && (
                              <span className="mt-1 inline-block rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                                {f.grupos.map((gid) => nombreGrupoPorId.get(gid) ?? '').filter(Boolean).join(' / ')}
                              </span>
                            )}
                          </th>
                          {dias.map((dia) => {
                            const busSel = busEnCelda(dia, f.id);
                            const publicado = esPublicado(dia, f.id);
                            const guardado = actualesPorCelda.get(claveCelda(dia, f.id));
                            return (
                              <td key={dia} className="border-l border-blue-50 p-1.5 align-middle">
                                <select
                                  aria-label={`${f.codigo} ${dia}`}
                                  disabled={publicado || B === 0}
                                  className={
                                    campo +
                                    (publicado
                                      ? ' border-green-300 bg-green-50 font-semibold text-green-900'
                                      : guardado
                                        ? ' border-blue-300 bg-sky-50/60'
                                        : busSel
                                          ? ' border-amber-300 bg-amber-50/60'
                                          : '')
                                  }
                                  value={busSel}
                                  onChange={(e) => cambiarBusFrecuencia(dia, f.id, e.target.value)}
                                >
                                  {!guardado && <option value="">Sin asignar…</option>}
                                  {busesGrupo.map((b) => (
                                    <option key={b.id} value={b.id}>
                                      {labelBus(b.id)}
                                    </option>
                                  ))}
                                </select>
                                {publicado && (
                                  <span className="mt-1 block text-center text-[11px] font-semibold text-green-700">
                                    Publicada
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}

                      {Array.from({ length: numParadas }, (_, idx) => (
                        <tr key={`parada-${idx}`} className="border-t border-amber-100 bg-amber-50/25">
                          <th className="p-2.5 align-middle font-semibold text-amber-900">
                            <span className="inline-flex items-center gap-1.5">
                              <Icono nombre="reloj" className="size-4 text-amber-600" />
                              Parada {idx + 1}
                            </span>
                            <span className="block text-[11px] font-normal text-amber-800/80">
                              Bus en descanso / respaldo
                            </span>
                          </th>
                          {dias.map((dia) => {
                            const stops = paradasDelDia(dia);
                            const busStop = stops[idx] ?? '';
                            return (
                              <td key={dia} className="border-l border-amber-100 p-1.5 align-middle">
                                <select
                                  aria-label={`Parada ${idx + 1} ${dia}`}
                                  disabled={B === 0}
                                  className={campo + ' border-amber-200 bg-amber-50/70 text-amber-950'}
                                  value={busStop}
                                  onChange={(e) => cambiarBusParada(dia, idx, e.target.value)}
                                >
                                  <option value="">Disponible</option>
                                  {busesGrupo.map((b) => (
                                    <option key={b.id} value={b.id}>
                                      {labelBus(b.id)}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 md:hidden">
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {dias.map((dia) => (
                      <button
                        key={dia}
                        type="button"
                        className={
                          'shrink-0 rounded-md px-3 py-2 text-xs capitalize ' +
                          (diaMovil === dia ? 'bg-blue-700 font-semibold text-white' : 'bg-blue-50 text-blue-900')
                        }
                        onClick={() => setDiaMovil(dia)}
                      >
                        {etiqueta(dia)}
                      </button>
                    ))}
                  </div>

                  {frecuenciasGrupo.map((f) => {
                    const busSel = busEnCelda(diaMovil, f.id);
                    const publicado = esPublicado(diaMovil, f.id);
                    return (
                      <div key={f.id} className="rounded-md border border-blue-100 p-2.5">
                        <strong className="text-sm text-[#1002b4]">
                          {f.codigo} · {f.hora}
                        </strong>
                        <p className="mb-1.5 text-xs text-slate-600">{f.ruta}</p>
                        <select
                          aria-label={`${f.codigo} ${diaMovil}`}
                          disabled={publicado || B === 0}
                          className={campo}
                          value={busSel}
                          onChange={(e) => cambiarBusFrecuencia(diaMovil, f.id, e.target.value)}
                        >
                          {!actualesPorCelda.has(claveCelda(diaMovil, f.id)) && <option value="">Sin asignar…</option>}
                          {busesGrupo.map((b) => (
                            <option key={b.id} value={b.id}>
                              {labelBus(b.id)}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}

                  {Array.from({ length: numParadas }, (_, idx) => {
                    const stops = paradasDelDia(diaMovil);
                    return (
                      <div key={`m-parada-${idx}`} className="rounded-md border border-amber-200 bg-amber-50/40 p-2.5">
                        <strong className="text-sm text-amber-900">Parada {idx + 1}</strong>
                        <select
                          aria-label={`Parada ${idx + 1} ${diaMovil}`}
                          disabled={B === 0}
                          className={campo + ' mt-1 border-amber-200'}
                          value={stops[idx] ?? ''}
                          onChange={(e) => cambiarBusParada(diaMovil, idx, e.target.value)}
                        >
                          <option value="">Disponible</option>
                          {busesGrupo.map((b) => (
                            <option key={b.id} value={b.id}>
                              {labelBus(b.id)}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Caja>

          {avisos.length > 0 && (
            <Aviso tipo="alerta">
              {avisos.slice(0, 10).map((x, i) => (
                <p key={i}>{x}</p>
              ))}
            </Aviso>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-100 bg-gradient-to-r from-sky-50 to-blue-50 p-3">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-blue-600 text-white">
                <Icono nombre="documento" className="size-6" />
              </span>
              <div>
                <strong>
                  Borrador · {cambiosPendientes.length} por guardar · {borradoresGrupo.length} listas para publicar
                </strong>
                <p className="text-xs">
                  {accionEnCurso === 'guardar'
                    ? 'Sincronizando borrador en lote con el servidor…'
                    : accionEnCurso === 'publicar'
                      ? 'Publicando salidas en lote…'
                      : 'Cambiar un bus dentro del mismo día intercambia su turno sin alterar los demás días.'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={boton}
                disabled={accionEnCurso !== null || !cambiosPendientes.length}
                onClick={() => void guardarBorrador()}
              >
                <Icono nombre="guardar" />
                {accionEnCurso === 'guardar' ? 'Guardando…' : 'Guardar borrador'}
              </button>
              <button
                type="button"
                className={primario}
                disabled={accionEnCurso !== null || !borradoresGrupo.length || cambiosPendientes.length > 0}
                onClick={() => void publicarSalidas()}
              >
                <Icono nombre="subir" />
                {accionEnCurso === 'publicar' ? 'Publicando…' : 'Publicar salidas'}
              </button>
            </div>
          </div>
        </fieldset>
      )}
    </section>
  );
}
