import { ConfiguracionCooperativaTabs } from '../../components/configuracion/ConfiguracionCooperativaTabs';
import { IconoBiblioteca } from '../../components/ui/IconoBiblioteca';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import FormularioCuentaBancaria from '../../components/configuracion/FormularioCuentaBancaria';
import type { DatosCuentaBancaria } from '../../components/configuracion/FormularioCuentaBancaria';
import { configuracionPagosApi } from '../../features/pagos/configuracionApi';
import type { ConfiguracionPagos, CuentaConfigurada } from '../../features/pagos/configuracionApi';
type CuentaBancaria = CuentaConfigurada;
const vacia: ConfiguracionPagos = { cooperativa: {id:'',nombre:''}, version:0, cuentas:[], metodos:[], formatos:[], maximoMB:5, referenciaObligatoria:false, bancos:[], limites:{formatos:[],maximoMB:5} };
function numeroOculto(numero: string) { return '•••• ' + numero.slice(-4); }
function estiloBanco(banco: string) { return banco === 'Banco Pichincha' ? 'bg-yellow-300 text-blue-950' : banco === 'Banco Guayaquil' ? 'bg-pink-700 text-white' : 'bg-emerald-800 text-white'; }
export default function ConfiguracionPagosPage({ panelCooperativa = false }: { panelCooperativa?: boolean }) {
  const [configuracion, setConfiguracion] = useState<ConfiguracionPagos>(vacia);
  const [guardada, setGuardada] = useState<ConfiguracionPagos>(vacia);
  const [cooperativas, setCooperativas] = useState<Array<{id:string;nombre:string}>>([]);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const bloqueo = useRef(false);
  const carga = useRef(0);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [params, setParams] = useSearchParams();
  const agregandoCuenta = params.has('cuenta');
  function setAgregandoCuenta(abierto: boolean, id = 'nueva') { const siguientes = new URLSearchParams(params); if (abierto) siguientes.set('cuenta', id); else siguientes.delete('cuenta'); setParams(siguientes); }
  const [editando, setEditando] = useState<CuentaBancaria | undefined>();
  const [cuentaVistaPrevia, setCuentaVistaPrevia] = useState('');
  const panel = 'min-w-0 rounded-lg border border-blue-100 bg-white p-4';
  const botonSecundario = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-900 transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50';
  const campo = 'mt-1 min-h-11 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100';
  const cuentasActivas = configuracion.cuentas.filter(c => c.activa);
  const transferenciaHabilitada = configuracion.metodos.some(m => m.codigo === 'BANCO' && m.habilitado);
  const cuentaPrevia = cuentasActivas.find(c => c.id === cuentaVistaPrevia) ?? cuentasActivas.find(c => c.predeterminada) ?? cuentasActivas[0];
  const hayCambios = configuracion !== guardada;
  useEffect(() => {
    let activo = true;
    const idUrl = params.get('cooperativaId');
    (async () => {
      const [r, datosUrl] = await Promise.all([
        configuracionPagosApi.cooperativas(),
        idUrl ? configuracionPagosApi.consultar(idUrl).catch(() => null) : Promise.resolve(null),
      ]);
      if (!activo) return;
      setCooperativas(r.cooperativas);
      if (!r.cooperativas.length) throw new Error('Tu cuenta no tiene permiso para configurar pagos en ninguna cooperativa.');
      const inicial = r.cooperativas.find(c => c.id === idUrl) ?? r.cooperativas[0];
      const datos = (idUrl && inicial.id === idUrl && datosUrl) ? datosUrl : await configuracionPagosApi.consultar(inicial.id);
      if (activo && !idUrl) { const p = new URLSearchParams(params); p.set('cooperativaId', inicial.id); setParams(p, { replace: true }); }
      if (activo) { setConfiguracion(datos); setGuardada(datos); }
    })().catch(e => { if (activo) setError(e instanceof Error ? e.message : 'No se pudo cargar la configuración.'); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, []);
  useEffect(()=>{const id=params.get('cooperativaId');if(!cargando&&id&&id!==configuracion.cooperativa.id&&cooperativas.some(c=>c.id===id))void cargar(id);},[params,cargando,configuracion.cooperativa.id,cooperativas]);
  async function cargar(id: string) {
    const numero = ++carga.current; setCargando(true); setError(''); setMensaje('');
    try { const d = await configuracionPagosApi.consultar(id); if(numero === carga.current) {setConfiguracion(d); setGuardada(d); setCuentaVistaPrevia('');} }
    catch(e) { if(numero === carga.current) setError(e instanceof Error ? e.message : 'No se pudo cargar la configuración.'); }
    finally { if(numero === carga.current) setCargando(false); }
  }
  function recargar() { if (!hayCambios || window.confirm('¿Descartar los cambios pendientes y cargar los datos guardados?')) void cargar(configuracion.cooperativa.id); }
  function cambiarCooperativa(id: string) { if(!hayCambios || window.confirm('¿Descartar los cambios pendientes y cambiar de cooperativa?')) {const p=new URLSearchParams(params);p.set('cooperativaId',id);setParams(p,{replace:true});void cargar(id);} }
  function limpiarMensajes() {setError(''); setMensaje('');}
  function cambiarEstadoCuenta(id:string) { limpiarMensajes(); setConfiguracion(a=>({...a,cuentas:a.cuentas.map(c=>c.id===id?{...c,activa:!c.activa,predeterminada:c.activa?false:c.predeterminada}:c)})); }
  function establecerPredeterminada(id:string) { limpiarMensajes(); setConfiguracion(a=>({...a,cuentas:a.cuentas.map(c=>({...c,predeterminada:c.activa && c.id===id}))})); }
  function cambiarMetodo(codigo:string) { limpiarMensajes(); setConfiguracion(a=>({...a,metodos:a.metodos.map(m=>m.codigo===codigo && m.disponible?{...m,habilitado:!m.habilitado}:m)})); }
  function cambiarFormato(formato:string) { limpiarMensajes(); setConfiguracion(a=>({...a,formatos:a.formatos.includes(formato)?a.formatos.filter(f=>f!==formato):[...a.formatos,formato]})); }
  function abrirFormulario(c?:CuentaBancaria) {setEditando(c);setAgregandoCuenta(true,c?.id);}
  async function persistir(datos:ConfiguracionPagos) {
    if (bloqueo.current) throw new Error('Espera a que termine el guardado.');
    bloqueo.current=true; setOcupado(true); limpiarMensajes();
    try { const guardado = await configuracionPagosApi.guardar(datos); setConfiguracion(guardado);setGuardada(guardado);setMensaje('Configuración guardada en PostgreSQL.'); }
    finally {bloqueo.current=false;setOcupado(false);}
  }
  async function agregarCuenta(datos:DatosCuentaBancaria):Promise<string|undefined> {
    const banco = configuracion.bancos.find(b=>b.nombre===datos.banco);
    if(!banco) return 'Selecciona un banco del catálogo.';
    const actualEditando = editando ?? configuracion.cuentas.find(c=>c.id===params.get('cuenta'));
    if(configuracion.cuentas.some(c=>c.id!==actualEditando?.id && c.bancoId===banco.id && c.tipo===datos.tipo && c.numero===datos.numero)) return 'Esta cuenta bancaria ya está agregada.';
    const cuenta:CuentaBancaria={...actualEditando,...datos,id:actualEditando?.id??crypto.randomUUID(),bancoId:banco.id};
    const cuentas = actualEditando ? configuracion.cuentas.map(c=>c.id===actualEditando.id?cuenta:c) : [...configuracion.cuentas,cuenta];
    try {await persistir({...configuracion,cuentas:cuentas.map(c=>datos.predeterminada?{...c,predeterminada:c.id===cuenta.id}:c)});setAgregandoCuenta(false);setEditando(undefined);}
    catch(e) {return e instanceof Error?e.message:'No se pudo guardar la cuenta.';}
  }
  async function guardarConfiguracion() {try {await persistir(configuracion);} catch(e) {setError(e instanceof Error?e.message:'No se pudo guardar.');}}
  function cancelarCambios() {setConfiguracion(guardada);limpiarMensajes();setMensaje('Se restauró la configuración guardada.');}
  if(cargando) return <p role="status" className="p-6 text-blue-950">Consultando configuración de pagos…</p>;
  if(!configuracion.cooperativa.id) return <section className="p-6 text-blue-950"><h1 className="text-2xl font-bold">Configuración de pagos</h1><p role="alert" className="mt-4">{error || 'No hay una cooperativa autorizada.'}</p><button className={botonSecundario} onClick={()=>window.location.reload()}>Reintentar</button></section>;
  const cuentaEdicion = editando ?? configuracion.cuentas.find(c => c.id === params.get('cuenta'));
  if(agregandoCuenta) return <section className="mx-auto my-6 max-w-7xl rounded-lg bg-white p-4 text-blue-950 sm:p-6">{panelCooperativa && <ConfiguracionCooperativaTabs />}<p className="mb-4 text-sm">Cooperativa: {configuracion.cooperativa.nombre}</p><FormularioCuentaBancaria key={cuentaEdicion?.id??'nueva'} iniciales={cuentaEdicion} bancosDisponibles={configuracion.bancos.map(b=>b.nombre)} onGuardar={agregarCuenta} onCancelar={()=>{if(!ocupado){setAgregandoCuenta(false);setEditando(undefined);}}} /></section>;
  return (
    <section className="py-4 text-blue-950">
      <fieldset disabled={ocupado} className="min-w-0">
      <header className="mb-4">
        <h1 className="text-2xl font-bold sm:text-3xl">
          Configuración de la cooperativa
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Configura los métodos de pago y las cuentas receptoras de la
          cooperativa.
        </p>
      </header>

      {panelCooperativa ? <ConfiguracionCooperativaTabs /> : <ul aria-label="Secciones de configuración" className="mb-4 grid grid-cols-3 gap-1 text-center text-xs sm:text-sm">
        <li aria-disabled="true" className="grid min-h-11 place-items-center rounded-md bg-blue-50 px-1 py-2 text-blue-900/80">
          Identidad y contacto
        </li>
        <li aria-current="page" className="grid min-h-11 place-items-center rounded-t-md border border-b-2 border-blue-100 border-b-blue-700 bg-white px-1 py-2 font-bold">
          Pagos
        </li>
        <li aria-disabled="true" className="grid min-h-11 place-items-center rounded-md bg-blue-50 px-1 py-2 text-blue-900/80">
          Tarifas y descuentos
        </li>
      </ul>}

      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 rounded-md bg-blue-50 p-4 text-sm text-blue-900">
        {cooperativas.length > 1 ? (
          <label className="grid min-w-48 flex-1 gap-1">Cooperativa<select className={campo} value={configuracion.cooperativa.id} onChange={e => cambiarCooperativa(e.target.value)}>{cooperativas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
        ) : (
          <p className="font-medium">Cooperativa: {configuracion.cooperativa.nombre}</p>
        )}
        <button className={botonSecundario + ' inline-flex items-center gap-2'} onClick={() => recargar()}><IconoBiblioteca nombre="buscar" className="size-4" />Recargar datos</button>
        <p className="w-full text-xs text-blue-800">{hayCambios ? 'Hay cambios pendientes de guardar.' : 'Configuración cargada correctamente.'}</p>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
        <section className={panel} aria-labelledby="titulo-cuentas">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="titulo-cuentas" className="flex items-center gap-2 text-lg font-bold">
                <IconoBiblioteca nombre="banco" className="size-5 text-blue-800" />
                Cuentas bancarias receptoras
              </h2>

              <p className="mt-1 max-w-md text-sm text-slate-600">
                Estas cuentas estarán disponibles para recibir transferencias y
                depósitos.
              </p>
            </div>

            <button
              type="button"
              className={botonSecundario}
              onClick={() => {
                limpiarMensajes();
                setEditando(undefined);
                setAgregandoCuenta(true);
              }}
            >
              <span aria-hidden="true">＋</span>
              Agregar cuenta bancaria
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {!configuracion.cuentas.length && <p className="rounded-md bg-blue-50 p-4 text-sm">Todavía no hay cuentas bancarias. Agrega una para habilitar las transferencias.</p>}
            {configuracion.cuentas.map((cuenta) => (
              <article
                key={cuenta.id}
                className="rounded-lg border border-blue-100 p-3"
                aria-label={`Cuenta de ${cuenta.banco}`}
              >
                <div className="grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      aria-hidden="true"
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-lg font-bold ${estiloBanco(
                        cuenta.banco,
                      )}`}
                    >
                      {cuenta.banco === "Banco Pichincha"
                        ? "P"
                        : cuenta.banco === "Banco Guayaquil"
                          ? "G"
                          : "PB"}
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-sm font-bold">{cuenta.banco}</h3>

                      <p className="mt-1 text-xs text-slate-600">
                        Cuenta {cuenta.tipo}
                      </p>

                      <p className="mt-1 text-sm font-semibold">
                        {numeroOculto(cuenta.numero)}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Titular</p>

                    <p className="mt-1 break-words text-sm">{cuenta.titular}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:flex-col sm:items-start">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        cuenta.activa
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {cuenta.activa ? "✓ Activa" : "Inactiva"}
                    </span>

                    {cuenta.predeterminada && (
                      <span className="rounded-full bg-teal-50 px-2 py-1 text-xs text-teal-800">
                        Predeterminada
                      </span>
                    )}
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  QR bancario: {cuenta.qrId ? "guardado" : "sin configurar"}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    className={botonSecundario}
                    onClick={() => abrirFormulario(cuenta)}
                    aria-label={`Editar cuenta de ${cuenta.banco}`}
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => cambiarEstadoCuenta(cuenta.id)}
                    className={`min-h-10 rounded-md border px-3 py-2 text-sm font-medium ${
                      cuenta.activa
                        ? "border-red-200 text-red-700 hover:bg-red-50"
                        : "border-green-300 text-green-800 hover:bg-green-50"
                    }`}
                    aria-label={`${
                      cuenta.activa ? "Desactivar" : "Activar"
                    } cuenta de ${cuenta.banco}`}
                  >
                    {cuenta.activa ? "Desactivar" : "Activar"}
                  </button>

                  <button
                    type="button"
                    className={`${botonSecundario} col-span-2 sm:col-span-1`}
                    disabled={!cuenta.activa || cuenta.predeterminada}
                    onClick={() => establecerPredeterminada(cuenta.id)}
                  >
                    <span aria-hidden="true">★</span>
                    {cuenta.predeterminada
                      ? "Predeterminada"
                      : "Establecer predeterminada"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={panel} aria-labelledby="titulo-metodos">
          <h2 id="titulo-metodos" className="flex items-center gap-2 text-lg font-bold">
            <IconoBiblioteca nombre="tarjeta" className="size-5 text-blue-800" />
            Métodos de pago
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Habilita los métodos disponibles para tus clientes.
          </p>

          <div className="mt-4 divide-y divide-blue-50">
            {configuracion.metodos.map((metodo) => (
              <div
                key={metodo.codigo}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">{metodo.nombre}</h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {metodo.descripcion}
                  </p>

                  {metodo.disponible && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer font-medium text-blue-700 hover:underline">
                        Editar instrucciones para el pasajero
                      </summary>
                      <label className="mt-2 block">
                        <span className="sr-only">Instrucciones de {metodo.nombre}</span>
                        <textarea
                          maxLength={1000}
                          value={metodo.instrucciones}
                          onChange={e => setConfiguracion(actual => ({...actual, metodos: actual.metodos.map(m => m.codigo === metodo.codigo ? {...m, instrucciones: e.target.value} : m)}))}
                          className={campo}
                        />
                      </label>
                    </details>
                  )}
                  {metodo.estado && (
                    <span className="mt-2 inline-block rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                      {metodo.estado}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={metodo.habilitado}
                  aria-label={metodo.nombre}
                  disabled={!metodo.disponible}
                  onClick={() => cambiarMetodo(metodo.codigo)}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50 ${
                    metodo.habilitado ? "bg-blue-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      metodo.habilitado ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          <p className="mt-3 rounded-md bg-blue-50 p-3 text-xs leading-5 text-blue-900">
            PayPhone admite cobros con tarjeta o saldo PayPhone al configurar{" "}
            <code>PAYPHONE_TOKEN</code> en el servidor. Tarjeta directa y PayPal
            permanecen pendientes de integración.
          </p>
        </section>
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <section className={panel} aria-labelledby="titulo-comprobantes">
          <h2 id="titulo-comprobantes" className="text-lg font-bold">
            Recepción de comprobantes
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Configura los archivos que podrán adjuntar los clientes.
          </p>

          <fieldset className="mt-4">
            <legend className="text-sm font-semibold">
              Formatos permitidos
            </legend>

            <div className="mt-2 flex flex-wrap gap-4">
              {configuracion.limites.formatos.map((formato) => (
                <label
                  key={formato}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={configuracion.formatos.includes(formato)}
                    onChange={() => cambiarFormato(formato)}
                    className="h-4 w-4 accent-blue-600"
                  />
                  {formato}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Tamaño máximo
              <select
                value={configuracion.maximoMB}
                className={campo}
                onChange={(evento) => {
                  limpiarMensajes();

                  setConfiguracion((actual) => ({
                    ...actual,
                    maximoMB: Number(evento.target.value),
                  }));
                }}
              >
                {[1, 2, 5].filter(m => m <= configuracion.limites.maximoMB).map(m => <option key={m} value={m}>{m} MB</option>)}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={configuracion.referenciaObligatoria} onChange={e => setConfiguracion(actual => ({...actual, referenciaObligatoria: e.target.checked}))} />Referencia de transferencia obligatoria</label>
            <div className="rounded-md border border-blue-100 p-3">
              <p className="text-sm font-semibold">Revisión de comprobantes</p>

              <p className="mt-2 text-sm text-slate-600">
                Manual por el oficinista
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            El envío de un comprobante no confirma el pago ni emite
            automáticamente el boleto.
          </p>
        </section>

        <section className={panel} aria-labelledby="titulo-vista-previa">
          <h2 id="titulo-vista-previa" className="text-lg font-bold">
            Vista previa para el cliente
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Solo se muestran las cuentas activas.
          </p>

          {!transferenciaHabilitada ? (
            <p className="mt-4 rounded-md bg-slate-50 p-4 text-sm text-slate-600">
              Transferencia / Depósito está deshabilitado.
            </p>
          ) : cuentasActivas.length === 0 ? (
            <p className="mt-4 rounded-md bg-amber-50 p-4 text-sm text-amber-900">
              No hay cuentas activas disponibles.
            </p>
          ) : (
            <>
              <label
                htmlFor="cuenta-vista-previa"
                className="mt-4 block text-sm font-semibold"
              >
                Selecciona una cuenta para realizar tu pago
              </label>

              <select
                id="cuenta-vista-previa"
                value={cuentaPrevia?.id ?? ""}
                onChange={(evento) => setCuentaVistaPrevia(evento.target.value)}
                className={campo}
              >
                {cuentasActivas.map((cuenta) => (
                  <option key={cuenta.id} value={cuenta.id}>
                    {cuenta.banco} · {cuenta.tipo} ·{" "}
                    {numeroOculto(cuenta.numero)}
                  </option>
                ))}
              </select>

              {cuentaPrevia && (
                <dl className="mt-3 space-y-2 rounded-md bg-blue-50 p-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <dt className="text-slate-600">Banco</dt>
                    <dd className="font-medium">{cuentaPrevia.banco}</dd>
                  </div>

                  <div className="flex flex-wrap justify-between gap-2">
                    <dt className="text-slate-600">Tipo de cuenta</dt>
                    <dd>{cuentaPrevia.tipo}</dd>
                  </div>

                  <div className="flex flex-wrap justify-between gap-2">
                    <dt className="text-slate-600">Número</dt>
                    <dd>{cuentaPrevia.numero}</dd>
                  </div>

                  <div className="flex flex-wrap justify-between gap-2">
                    <dt className="text-slate-600">Titular</dt>
                    <dd className="break-words">{cuentaPrevia.titular}</dd>
                  </div>
                </dl>
              )}
            </>
          )}
        </section>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      <p
        role="status"
        className={
          mensaje
            ? "mt-4 rounded-md bg-blue-50 p-3 text-sm text-blue-900"
            : "sr-only"
        }
      >
        {mensaje}
      </p>

      <div className="mt-5 flex flex-col-reverse justify-end gap-3 border-t border-blue-100 pt-4 sm:flex-row">
        <button
          type="button"
          onClick={cancelarCambios}
          className={botonSecundario}
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={guardarConfiguracion}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-red-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
        >
          <IconoBiblioteca nombre="guardar" className="size-4" />
          {ocupado ? "Guardando…" : "Guardar configuración"}
        </button>
      </div>

      </fieldset>
    </section>
  );
}
