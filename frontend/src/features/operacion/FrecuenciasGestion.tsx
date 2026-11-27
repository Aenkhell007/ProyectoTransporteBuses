import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ComboBusqueda } from '../../components/ui/ComboBusqueda';
import { etiquetaTipoPunto } from '../../constants/ecuador';
import {
  inferirTipoPuntoDesdeNombre,
  obtenerLugaresConocidosParroquia,
  obtenerParroquiasPorCanton,
} from '../../constants/parroquiasEcuador';
import { Dialogo } from '../oficina/ui';
import { guardarOperacion, type Frecuencia, type TerminalOperacion } from './api';
import {
  useOperacion,
  Titulo,
  Caja,
  Campo,
  Estado,
  SelectorAmbito,
  Mensajes,
  Aviso,
  Icono,
  Interruptor,
  campo,
  boton,
  primario,
} from './ui';

type Formulario = {
  id?: string;
  version?: number;
  codigo: string;
  hora: string;
  resolucion: string;
  tipo: 'DIRECTO' | 'CON_PARADAS';
  activa: boolean;
  grupos: string[];
  paradas: { terminalId: string; minutos: number }[];
  costoBase: string;
  recargoVipPct: string;
  usada?: boolean;
};

const nuevo = (gruposIniciales: string[] = []): Formulario => ({
  codigo: '',
  hora: '06:00',
  resolucion: '',
  tipo: 'CON_PARADAS',
  activa: true,
  grupos: gruposIniciales,
  paradas: [
    { terminalId: '', minutos: 0 },
    { terminalId: '', minutos: 60 },
  ],
  costoBase: '10.00',
  recargoVipPct: '60',
});

const copiar = (v: Frecuencia): Formulario => {
  const baseCents = v.costo_base_centavos ?? null;
  const vipCents = v.costo_vip_centavos ?? null;
  const pct =
    baseCents && baseCents > 0 && vipCents != null
      ? String(Math.max(0, Math.round(((vipCents - baseCents) / baseCents) * 100)))
      : '60';
  return {
    id: v.id,
    version: v.version,
    codigo: v.codigo,
    hora: v.hora,
    resolucion: v.resolucion,
    tipo: v.tipo,
    activa: v.activa,
    grupos: [...v.grupos],
    paradas: v.paradas.map((p) => ({ terminalId: p.terminalId, minutos: p.minutos })),
    costoBase: baseCents != null ? (baseCents / 100).toFixed(2) : '',
    recargoVipPct: pct,
    usada: v.usada,
  };
};

export default function FrecuenciasGestion() {
  const a = useOperacion(2, 'frecuencias');
  const d = a.datos;
  const [f, setF] = useState<Formulario>(() => nuevo());
  const [buscar, setBuscar] = useState('');
  const [guardandoFrec, setGuardandoFrec] = useState(false);

  const [modalParadero, setModalParadero] = useState(false);
  const [guardandoParadero, setGuardandoParadero] = useState(false);
  const [errorParadero, setErrorParadero] = useState('');
  const [nuevoParadero, setNuevoParadero] = useState<{
    ciudadId: string;
    parroquia: string;
    lugar: string;
  }>({
    ciudadId: '',
    parroquia: '',
    lugar: '',
  });

  const gruposActivosIds = useMemo(
    () => (d?.grupos ?? []).filter((g) => g.activo).map((g) => g.id),
    [d?.grupos],
  );

  useEffect(() => {
    if (!d) return;
    setF((v) => {
      const actual = d.frecuencias.find((x) => x.id === v.id) ?? (v.id ? undefined : d.frecuencias[0]);
      if (actual) return copiar(actual);
      if (!v.id && v.paradas.every((p) => !p.terminalId)) return nuevo(gruposActivosIds);
      return v;
    });
  }, [d?.cooperativa.id]);

  useEffect(() => {
    if (!d) return;
    if (!d.frecuencias.length && !f.id && !f.grupos.length && gruposActivosIds.length) {
      setF((v) => ({ ...v, grupos: gruposActivosIds }));
    }
  }, [d, f.id, f.grupos.length, gruposActivosIds]);

  const ambitoCoop = (d?.cooperativa.ambito_operacion ?? 'INTERPROVINCIAL').toUpperCase();
  const provinciaCoop = (d?.cooperativa.provincia ?? '').trim();
  const esLocal = (ambitoCoop === 'URBANA' || ambitoCoop === 'RURAL') && Boolean(provinciaCoop);

  const cantonesDisponibles = useMemo(() => {
    if (d?.cantonesProvincia?.length) return d.cantonesProvincia;
    const map = new Map<string, { id: string; nombre: string; provincia: string }>();
    for (const t of d?.terminales ?? []) {
      if (t.ciudad_id && !map.has(t.ciudad_id)) {
        map.set(t.ciudad_id, { id: t.ciudad_id, nombre: t.ciudad, provincia: t.provincia ?? '' });
      }
    }
    return [...map.values()].sort((x, y) => x.nombre.localeCompare(y.nombre, 'es'));
  }, [d?.cantonesProvincia, d?.terminales]);

  function parche(p: Partial<Formulario>) {
    setF((v) => ({ ...v, ...p }));
  }

  const inicio = Number(f.hora.slice(0, 2)) * 60 + Number(f.hora.slice(3));
  const ultima = f.paradas.length - 1;

  function reloj(min: number) {
    const m = (inicio + min) % 1440;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }

  function minutos(h: string, i: number) {
    let m = Number(h.slice(0, 2)) * 60 + Number(h.slice(3)) - inicio;
    while (m < 0 || m <= (f.paradas[i - 1]?.minutos ?? -1)) m += 1440;
    return m;
  }

  function parada(i: number, p: Partial<Formulario['paradas'][number]>) {
    parche({ paradas: f.paradas.map((v, j) => (i === j ? { ...v, ...p } : v)) });
  }

  const cantonSeleccionado = useMemo(
    () => cantonesDisponibles.find((ci) => ci.id === nuevoParadero.ciudadId),
    [cantonesDisponibles, nuevoParadero.ciudadId],
  );

  const opcionesParroquia = useMemo(
    () =>
      obtenerParroquiasPorCanton(cantonSeleccionado?.nombre ?? '').map((p) => ({
        valor: p,
        etiqueta: p,
        subtitulo: cantonSeleccionado?.nombre ? `Cantón ${cantonSeleccionado.nombre}` : undefined,
      })),
    [cantonSeleccionado?.nombre],
  );

  const opcionesLugarConocido = useMemo(
    () =>
      obtenerLugaresConocidosParroquia(nuevoParadero.parroquia, cantonSeleccionado?.nombre ?? '').map((lugar) => ({
        valor: lugar,
        etiqueta: lugar,
        subtitulo: nuevoParadero.parroquia.trim() ? `Parroquia ${nuevoParadero.parroquia.trim()}` : undefined,
      })),
    [nuevoParadero.parroquia, cantonSeleccionado?.nombre],
  );

  const opcionesTerminal = useMemo(
    () =>
      (d?.terminales ?? []).map((t) => {
        const tipo = t.tipo_punto ?? 'TERMINAL';
        const parroquia = t.sector?.trim() && t.sector.trim().toLowerCase() !== t.nombre.trim().toLowerCase() ? t.sector.trim() : '';
        const detalle = [
          parroquia ? `Parroquia ${parroquia}` : null,
          etiquetaTipoPunto(tipo),
          t.referencia?.trim() && t.referencia.trim().toLowerCase() !== parroquia.toLowerCase() ? t.referencia.trim() : null,
          t.direccion,
          `${t.ciudad}${t.provincia ? ` · ${t.provincia}` : ''}`,
        ]
          .filter(Boolean)
          .join(' · ');
        return {
          valor: t.id,
          etiqueta: esLocal
            ? `${t.nombre}${parroquia ? ` · ${parroquia}` : ''} (${t.ciudad})`
            : `${t.provincia ? `${t.provincia} (${t.ciudad})` : t.ciudad} · ${t.nombre}`,
          subtitulo: detalle,
        };
      }),
    [d?.terminales, esLocal],
  );

  const costoBaseNum = Number(f.costoBase);
  const baseValido = Number.isFinite(costoBaseNum) && costoBaseNum > 0;
  const vipPctNum = f.recargoVipPct.trim() === '' ? 60 : Math.max(0, Number(f.recargoVipPct) || 0);
  const vipUsd = baseValido ? costoBaseNum * (1 + vipPctNum / 100) : 0;
  const prefNormalUsd = baseValido ? costoBaseNum * 0.5 : 0;
  const prefVipUsd = baseValido ? vipUsd * 0.5 : 0;

  const todosGruposMarcados =
    gruposActivosIds.length > 0 && gruposActivosIds.every((id) => f.grupos.includes(id));

  function alternarTodosGrupos() {
    if (!gruposActivosIds.length) return;
    parche({
      grupos: todosGruposMarcados ? [gruposActivosIds[0]] : gruposActivosIds,
    });
  }

  function alternarGrupo(id: string) {
    const existe = f.grupos.includes(id);
    parche({
      grupos: existe ? f.grupos.filter((x) => x !== id) : [...f.grupos, id],
    });
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!d || guardandoFrec) return;
    if (!f.paradas[0]?.terminalId || !f.paradas[ultima]?.terminalId) {
      a.setError(esLocal ? 'Selecciona el paradero o punto de origen y destino.' : 'Selecciona la terminal de origen y destino.');
      return;
    }
    if (!f.grupos.length) {
      a.setError('Selecciona al menos un grupo de buses o marca «TODOS» para esta frecuencia.');
      return;
    }
    const baseCents = f.costoBase.trim() ? Math.round(Number(f.costoBase) * 100) : undefined;
    if (baseCents !== undefined && (!Number.isFinite(baseCents) || baseCents <= 0)) {
      a.setError('Ingresa un costo base válido mayor a $0.00.');
      return;
    }
    setGuardandoFrec(true);
    a.setError('');
    a.setMensaje('');
    try {
      const r = await guardarOperacion<{ id: string; frecuencia?: Frecuencia; mensaje: string }>('frecuencias', d.cooperativa.id, {
        ...f,
        costoBaseCentavos: baseCents,
        recargoVipPct: vipPctNum,
      });
      if (r.frecuencia) {
        const frecGuardada = r.frecuencia;
        a.setDatos((prev) => {
          if (!prev) return prev;
          const existe = prev.frecuencias.some((x) => x.id === frecGuardada.id);
          const siguientes = existe
            ? prev.frecuencias.map((x) => (x.id === frecGuardada.id ? frecGuardada : x))
            : [...prev.frecuencias, frecGuardada].sort((x, y) => x.codigo.localeCompare(y.codigo));
          return { ...prev, frecuencias: siguientes };
        });
        setF(copiar(frecGuardada));
      } else {
        setF((v) => ({ ...v, id: r.id }));
        await a.cargar();
      }
      a.setMensaje(r.mensaje);
    } catch (err) {
      a.setError(err instanceof Error ? err.message : 'No se pudo guardar la frecuencia.');
    } finally {
      setGuardandoFrec(false);
    }
  }

  function abrirModalParadero() {
    setErrorParadero('');
    setNuevoParadero({
      ciudadId: cantonesDisponibles[0]?.id ?? '',
      parroquia: '',
      lugar: '',
    });
    setModalParadero(true);
  }

  async function registrarParadero(e: FormEvent) {
    e.preventDefault();
    if (!d || guardandoParadero) return;
    const parroquia = nuevoParadero.parroquia.trim();
    const lugar = nuevoParadero.lugar.trim();
    if (!nuevoParadero.ciudadId || !parroquia || !lugar) {
      setErrorParadero('Selecciona el cantón, elige o escribe la parroquia y elige o escribe el lugar conocido.');
      return;
    }
    setGuardandoParadero(true);
    setErrorParadero('');
    try {
      const res = await guardarOperacion<{ terminal: TerminalOperacion; mensaje: string }>(
        'paraderos',
        d.cooperativa.id,
        {
          ciudadId: nuevoParadero.ciudadId,
          nombre: lugar,
          tipoPunto: inferirTipoPuntoDesdeNombre(lugar),
          sector: parroquia,
          direccion: null,
          referencia: parroquia,
        },
        'POST',
      );
      a.setDatos((prev) => {
        if (!prev) return prev;
        const filtrados = prev.terminales.filter((t) => t.id !== res.terminal.id);
        return {
          ...prev,
          terminales: [...filtrados, res.terminal].sort((x, y) => x.ciudad.localeCompare(y.ciudad, 'es') || x.nombre.localeCompare(y.nombre, 'es')),
        };
      });
      setModalParadero(false);
      a.setMensaje(res.mensaje);
    } catch (err) {
      setErrorParadero(err instanceof Error ? err.message : 'No se pudo registrar el punto de referencia.');
    } finally {
      setGuardandoParadero(false);
    }
  }

  const placeholderBusqueda = esLocal
    ? `Busca paradero, barrio, parroquia o mercado en ${provinciaCoop}…`
    : 'Busca provincia o cantón…';

  const selectorTerminal = (i: number, placeholder = placeholderBusqueda) => (
    <ComboBusqueda
      value={f.paradas[i]?.terminalId ?? ''}
      disabled={f.usada}
      opciones={opcionesTerminal}
      placeholder={placeholder}
      className={campo}
      onChange={(valor) => parada(i, { terminalId: valor })}
    />
  );

  const termOrigObj = d?.terminales.find((t) => t.id === f.paradas[0]?.terminalId);
  const termDestObj = d?.terminales.find((t) => t.id === f.paradas[ultima]?.terminalId);

  return (
    <section className="space-y-3 py-4 text-blue-900">
      <Titulo
        titulo="Gestión de frecuencias"
        descripcion={
          esLocal
            ? `Registra rutas ${ambitoCoop === 'URBANA' ? 'urbanas' : 'rurales'} dentro de ${provinciaCoop}, sus paraderos y tarifas.`
            : 'Registra frecuencias autorizadas, sus paradas, grupos habilitados y tarifa base.'
        }
      >
        <SelectorAmbito a={a} />
      </Titulo>
      <Mensajes a={a} />

      {d && (
        <>
          {esLocal && (
            <Aviso tipo="info">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p>
                  <strong>Georreferenciación provincial ({provinciaCoop}):</strong> las paradas, barrios, parroquias, mercados y terminales locales están filtrados exclusivamente a esta provincia ({d.terminales.length} puntos disponibles).
                </p>
                {d.permisos.operacion && (
                  <button type="button" className={boton} onClick={abrirModalParadero}>
                    <Icono nombre="ubicacion" className="size-4" />
                    + Nuevo paradero / punto de referencia
                  </button>
                )}
              </div>
            </Aviso>
          )}

          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-blue-100">
            <nav className="flex gap-1 text-sm">
              <span className="border-b-2 border-blue-700 px-5 py-3 font-bold">Frecuencias</span>
              <Link className="px-5 py-3" to={'/cooperativa/frecuencias/grupos?cooperativaId=' + (a.datos?.cooperativa.id ?? '')}>
                Grupos habilitados
              </Link>
            </nav>
            <div className="mb-2 flex flex-wrap gap-2">
              {!esLocal && d.permisos.operacion && (
                <button type="button" className={boton} onClick={abrirModalParadero}>
                  <Icono nombre="ubicacion" className="size-4" />
                  + Nuevo punto local
                </button>
              )}
              <button type="button" className={primario} onClick={() => setF(nuevo(gruposActivosIds))}>
                <Icono nombre="mas" />
                Nueva frecuencia
              </button>
            </div>
          </div>

          <details className="rounded-md border border-blue-100 px-3 py-2 text-sm">
            <summary className="cursor-pointer">
              Buscar o seleccionar frecuencia{' '}
              <span className="ml-2 text-xs text-blue-600">{d.frecuencias.length} registradas</span>
            </summary>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <input
                aria-label="Buscar frecuencia"
                className={campo}
                placeholder="Código, ruta o resolución"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
              />
              <select
                aria-label="Frecuencia seleccionada"
                className={campo}
                value={f.id ?? ''}
                onChange={(e) => {
                  const v = d.frecuencias.find((x) => x.id === e.target.value);
                  setF(v ? copiar(v) : nuevo(gruposActivosIds));
                }}
              >
                <option value="">Nueva frecuencia</option>
                {d.frecuencias
                  .filter((v) => (v.codigo + ' ' + v.ruta + ' ' + v.resolucion).toLowerCase().includes(buscar.toLowerCase()))
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.codigo} · {v.ruta}
                    </option>
                  ))}
              </select>
            </div>
          </details>

          <form onSubmit={guardar}>
            <fieldset disabled={guardandoFrec || !d.permisos.operacion} className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-4 rounded-lg border border-sky-200 bg-gradient-to-r from-sky-100 to-blue-50 px-4 py-3">
                <Icono nombre="bus" className="size-8 text-blue-800" />
                <input
                  aria-label="Código de frecuencia"
                  maxLength={50}
                  className="w-44 min-w-0 bg-transparent text-xl! font-bold! text-[#1002b4] outline-none placeholder:text-blue-500 focus:ring-2 focus:ring-blue-300"
                  placeholder="Automático"
                  value={f.codigo}
                  onChange={(e) => parche({ codigo: e.target.value })}
                />
                <strong className="text-base">
                  {(esLocal ? termOrigObj?.nombre : termOrigObj?.ciudad) ?? 'Origen'} →{' '}
                  {(esLocal ? termDestObj?.nombre : termDestObj?.ciudad) ?? 'Destino'}
                </strong>
                <span className="ml-auto">
                  <Estado valor={f.activa ? 'Activa' : 'Inactiva'} />
                </span>
              </div>

              <div className="grid items-stretch gap-3 lg:grid-cols-[3fr_2fr]">
                <Caja titulo="Datos de la frecuencia" icono="documento">
                  <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
                    <Campo nombre={esLocal ? `Paradero / punto de origen (${provinciaCoop})` : 'Origen'}>
                      {selectorTerminal(0, esLocal ? `Paradero o sector de origen en ${provinciaCoop}…` : 'Provincia (Cantón) de origen…')}
                    </Campo>
                    <Campo nombre={esLocal ? `Paradero / punto de destino (${provinciaCoop})` : 'Destino'}>
                      {selectorTerminal(ultima, esLocal ? `Paradero o sector de destino en ${provinciaCoop}…` : 'Provincia (Cantón) de destino…')}
                    </Campo>
                    <Campo nombre="Hora de salida">
                      <div className="relative">
                        <Icono nombre="reloj" className="absolute left-3 top-3 size-4" />
                        <input
                          type="time"
                          className={campo + ' pl-9'}
                          required
                          disabled={f.usada}
                          value={f.hora}
                          onChange={(e) => parche({ hora: e.target.value })}
                        />
                      </div>
                    </Campo>
                    <Campo nombre="Número de resolución">
                      <div className="relative">
                        <Icono nombre="documento" className="absolute left-3 top-3 size-4" />
                        <input
                          className={campo + ' pl-9'}
                          required
                          maxLength={150}
                          placeholder="RES-EJEMPLO-008"
                          value={f.resolucion}
                          onChange={(e) => parche({ resolucion: e.target.value })}
                        />
                      </div>
                    </Campo>
                    <fieldset className="min-w-0" disabled={f.usada}>
                      <legend className="mb-2 text-sm">Tipo de viaje</legend>
                      <div className="flex flex-wrap gap-4 text-sm">
                        {[
                          ['CON_PARADAS', 'Con paradas'],
                          ['DIRECTO', 'Directo'],
                        ].map(([v, n]) => (
                          <label key={v} className="flex items-center gap-2">
                            <input
                              className="size-5 accent-blue-700"
                              type="radio"
                              name="tipo-viaje"
                              checked={f.tipo === v}
                              onChange={() => parche({ tipo: v as Formulario['tipo'] })}
                            />
                            {n}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <div>
                      <p className="mb-2 text-sm">Estado</p>
                      <div className="flex items-center gap-3">
                        <Interruptor nombre="Estado de la frecuencia" valor={f.activa} cambiar={() => parche({ activa: !f.activa })} />
                        <span className="text-sm">{f.activa ? 'Activa' : 'Inactiva'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Aviso>
                      La resolución identifica la autorización de la frecuencia.
                      <br />
                      La fecha y el bus se asignan en la hoja de ruta.
                    </Aviso>
                  </div>
                  {f.usada && (
                    <p className="mt-2 text-xs text-blue-700">
                      Ruta y horario protegidos porque existen viajes. Crea otra frecuencia para modificarlos.
                    </p>
                  )}
                </Caja>

                <div className="flex flex-col gap-3">
                  <Caja titulo="Grupos de buses habilitados" icono="personas">
                    <div className="space-y-3">
                      {gruposActivosIds.length > 0 && (
                        <label className="flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50/70 px-3 py-2 text-sm font-semibold text-blue-950">
                          <input
                            type="checkbox"
                            className="size-5 accent-blue-700"
                            checked={todosGruposMarcados}
                            onChange={alternarTodosGrupos}
                          />
                          <span>TODOS (Todos los grupos activos)</span>
                        </label>
                      )}
                      {d.grupos.map((g) => (
                        <label key={g.id} className="flex items-center gap-3 text-sm">
                          <input
                            type="checkbox"
                            className="size-5 accent-blue-700"
                            disabled={!g.activo && !f.grupos.includes(g.id)}
                            checked={f.grupos.includes(g.id)}
                            onChange={() => alternarGrupo(g.id)}
                          />
                          <span>
                            {g.nombre}
                            {!g.activo && ' · Inactivo'}
                          </span>
                        </label>
                      ))}
                      {!d.grupos.length && (
                        <p className="text-sm">
                          Primero crea un grupo en{' '}
                          <Link className="font-semibold underline" to="/cooperativa/grupos">
                            Grupos de buses
                          </Link>
                          .
                        </p>
                      )}
                      <div className="pt-1">
                        <Aviso>
                          Puedes habilitar uno o varios grupos (o marcar <strong>TODOS</strong>) para asignar buses Mixtos, VIP y Normales en la hoja de ruta.
                        </Aviso>
                      </div>
                    </div>
                  </Caja>

                  <Caja titulo="Tarifa base de la ruta" icono="dinero">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Campo nombre="Costo base Normal (USD)">
                        <input
                          type="number"
                          step="0.01"
                          min="0.50"
                          max="1000"
                          className={campo}
                          placeholder="10.00"
                          value={f.costoBase}
                          onChange={(e) => parche({ costoBase: e.target.value })}
                        />
                      </Campo>
                      <Campo nombre="Recargo VIP (%)">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="200"
                          className={campo}
                          placeholder="60"
                          value={f.recargoVipPct}
                          onChange={(e) => parche({ recargoVipPct: e.target.value })}
                        />
                      </Campo>
                    </div>
                    <div className="mt-3 grid gap-2 rounded-md border border-blue-100 bg-blue-50/50 p-3 text-xs sm:grid-cols-2">
                      <div>
                        <span className="text-slate-600">Asiento VIP (+{vipPctNum}%)</span>
                        <strong className="mt-0.5 block text-sm text-[#1002b4]">
                          {baseValido ? `$${vipUsd.toFixed(2)}` : '—'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-600">Tercera edad / Discapacidad (-50%)</span>
                        <strong className="mt-0.5 block text-sm text-green-800">
                          {baseValido ? `Normal $${prefNormalUsd.toFixed(2)} · VIP $${prefVipUsd.toFixed(2)}` : '—'}
                        </strong>
                      </div>
                    </div>
                  </Caja>
                </div>
              </div>

              <Caja
                titulo={esLocal ? 'Paraderos y puntos intermedios autorizados' : 'Paradas intermedias autorizadas'}
                icono="ubicacion"
                accion={
                  <button
                    type="button"
                    className={boton}
                    disabled={f.usada || f.tipo === 'DIRECTO' || f.paradas.length >= 30}
                    onClick={() =>
                      parche({
                        paradas: [
                          ...f.paradas.slice(0, -1),
                          { terminalId: '', minutos: Math.max(1, (f.paradas.at(-1)?.minutos ?? 60) - 30) },
                          f.paradas.at(-1)!,
                        ],
                      })
                    }
                  >
                    <Icono nombre="mas" />
                    Añadir parada
                  </button>
                }
              >
                <div className="mb-4 flex items-center overflow-x-auto px-2 py-3">
                  {f.paradas.map((p, i) => {
                    const term = d.terminales.find((t) => t.id === p.terminalId);
                    const etiquetaNodo = term ? (esLocal ? term.nombre : term.ciudad) : esLocal ? 'Selecciona paradero' : 'Selecciona ciudad';
                    return (
                      <div key={i} className="relative min-w-28 flex-1 text-center text-xs">
                        <span className={'block ' + (i === 0 || i === ultima ? 'font-bold' : '')}>{etiquetaNodo}</span>
                        <span className="mb-2 block text-[11px] text-slate-500">
                          {i === 0 ? '(Origen)' : i === ultima ? '(Destino)' : `Parada ${i}`}
                        </span>
                        <div className="relative flex items-center">
                          <span className={'h-1 flex-1 ' + (i ? 'bg-slate-300' : 'bg-transparent')} />
                          <span
                            className={
                              'z-10 size-4 rounded-full border-4 bg-white ' +
                              (i === 0 || i === ultima ? 'border-green-600' : 'border-slate-400')
                            }
                          />
                          <span className={'h-1 flex-1 ' + (i < ultima ? 'bg-slate-300' : 'bg-transparent')} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="overflow-x-auto rounded-md border border-blue-100">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-blue-50">
                      <tr>
                        {[
                          '#',
                          esLocal ? 'Paradero / Sector / Referencia' : 'Provincia (Cantón) / Terminal',
                          'Orden',
                          'Hora estimada',
                          'Acción',
                        ].map((n) => (
                          <th key={n} className="px-3 py-2">
                            {n}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {f.paradas.slice(1, -1).map((p, j) => {
                        const i = j + 1;
                        return (
                          <tr key={i} className="border-t border-blue-50">
                            <td className="px-3">{i}</td>
                            <td className="min-w-52 px-2 py-1">{selectorTerminal(i)}</td>
                            <td className="px-3">{i}</td>
                            <td className="px-2">
                              <input
                                aria-label={'Hora de parada ' + i}
                                className={campo}
                                type="time"
                                disabled={f.usada}
                                value={reloj(p.minutos)}
                                onChange={(e) => parada(i, { minutos: minutos(e.target.value, i) })}
                              />
                            </td>
                            <td className="px-2">
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  className="rounded px-2 py-1.5 hover:bg-blue-50 disabled:opacity-40"
                                  disabled={f.usada || i === 1}
                                  aria-label={'Subir parada ' + i}
                                  onClick={() => {
                                    const ps = [...f.paradas];
                                    [ps[i - 1], ps[i]] = [ps[i], ps[i - 1]];
                                    parche({ paradas: ps });
                                  }}
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  className="rounded p-2 text-red-600 hover:bg-red-50 disabled:opacity-40"
                                  disabled={f.usada}
                                  aria-label={'Quitar parada ' + i}
                                  onClick={() => parche({ paradas: f.paradas.filter((_, k) => k !== i) })}
                                >
                                  <Icono nombre="papelera" className="size-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {f.paradas.length === 2 && (
                    <p className="p-3 text-sm text-blue-700">
                      {f.tipo === 'DIRECTO' ? 'Viaje directo, sin paradas intermedias.' : 'Todavía no hay paradas intermedias.'}
                    </p>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                  <Campo nombre="Tiempo total hasta el destino (minutos)">
                    <input
                      type="number"
                      required
                      min="1"
                      max="10080"
                      className={campo + ' max-w-48'}
                      disabled={f.usada}
                      value={f.paradas[ultima]?.minutos ?? 60}
                      onChange={(e) => parada(ultima, { minutos: Number(e.target.value) })}
                    />
                  </Campo>
                  <small>
                    Llegada estimada: <strong>{reloj(f.paradas[ultima]?.minutos ?? 60)}</strong>
                    {(f.paradas[ultima]?.minutos ?? 0) >= 1440 ? ' · día siguiente' : ''}
                  </small>
                </div>
              </Caja>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Aviso>La disponibilidad del asiento se controla por tramo para evitar ventas superpuestas.</Aviso>
                <div className="flex gap-3">
                  <button
                    className={boton}
                    type="button"
                    onClick={() => {
                      const v = d.frecuencias.find((x) => x.id === f.id);
                      setF(v ? copiar(v) : nuevo(gruposActivosIds));
                    }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" disabled={guardandoFrec || !d.permisos.operacion} className={primario}>
                    <Icono nombre="guardar" />
                    {guardandoFrec ? 'Guardando…' : 'Guardar frecuencia'}
                  </button>
                </div>
              </div>
            </fieldset>
          </form>
        </>
      )}

      {modalParadero && d && (
        <Dialogo
          titulo={esLocal ? `Nuevo paradero / punto en ${provinciaCoop}` : 'Registrar punto de referencia local'}
          textoCerrar="Cerrar"
          cerrar={() => !guardandoParadero && setModalParadero(false)}
        >
          <form className="space-y-3" onSubmit={registrarParadero}>
            <Campo nombre={esLocal ? `Cantón (${provinciaCoop}) *` : 'Cantón / Ciudad *'}>
              <select
                required
                className={campo}
                value={nuevoParadero.ciudadId}
                onChange={(e) =>
                  setNuevoParadero({
                    ciudadId: e.target.value,
                    parroquia: '',
                    lugar: '',
                  })
                }
              >
                <option value="">Selecciona…</option>
                {cantonesDisponibles.map((ci) => (
                  <option key={ci.id} value={ci.id}>
                    {ci.nombre}
                    {ci.provincia && !esLocal ? ` (${ci.provincia})` : ''}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo nombre="Parroquia *">
              <ComboBusqueda
                permitirLibre
                value={nuevoParadero.parroquia}
                disabled={!nuevoParadero.ciudadId}
                opciones={opcionesParroquia}
                placeholder={
                  nuevoParadero.ciudadId
                    ? 'Elige o escribe la parroquia (ej. Santa Rosa)…'
                    : 'Primero selecciona un cantón…'
                }
                className={campo}
                onChange={(parroquia) =>
                  setNuevoParadero((prev) => ({
                    ...prev,
                    parroquia,
                    lugar: parroquia !== prev.parroquia ? '' : prev.lugar,
                  }))
                }
              />
            </Campo>
            <Campo nombre="Lugar conocido / Paradero *">
              <ComboBusqueda
                permitirLibre
                value={nuevoParadero.lugar}
                disabled={!nuevoParadero.parroquia.trim()}
                opciones={opcionesLugarConocido}
                placeholder={
                  nuevoParadero.parroquia.trim()
                    ? 'Elige o escribe un lugar conocido (ej. Parque Central, Gasolinera)…'
                    : 'Primero elige o escribe una parroquia…'
                }
                className={campo}
                onChange={(lugar) => setNuevoParadero((prev) => ({ ...prev, lugar }))}
              />
            </Campo>
            <p className="text-xs text-slate-600">
              Solo selecciona el cantón, parroquia y punto emblemático; se guardará con la parroquia como referencia automática.
            </p>
            {errorParadero && (
              <p role="alert" className="rounded bg-red-50 p-2 text-xs text-red-700">
                {errorParadero}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className={boton}
                disabled={guardandoParadero}
                onClick={() => setModalParadero(false)}
              >
                Cancelar
              </button>
              <button type="submit" className={primario} disabled={guardandoParadero}>
                <Icono nombre="guardar" />
                {guardandoParadero ? 'Guardando…' : 'Registrar punto'}
              </button>
            </div>
          </form>
        </Dialogo>
      )}
    </section>
  );
}
