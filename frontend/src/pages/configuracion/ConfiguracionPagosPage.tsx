import { useState } from "react";
import FormularioCuentaBancaria from "../../components/configuracion/FormularioCuentaBancaria";
import type { DatosCuentaBancaria } from "../../components/configuracion/FormularioCuentaBancaria";

type CuentaBancaria = {
  ruc?: string;
  alias?: string;
  moneda?: "USD";
  qr?: File | null;
  id: string;
  banco: string;
  tipo: "Corriente" | "Ahorros";
  numero: string;
  titular: string;
  activa: boolean;
  predeterminada: boolean;
};

type MetodoPago = {
  codigo: string;
  nombre: string;
  descripcion: string;
  habilitado: boolean;
  disponible: boolean;
  estado?: string;
};

type Configuracion = {
  cuentas: CuentaBancaria[];
  metodos: MetodoPago[];
  formatos: string[];
  maximoMB: number;
};

type FormularioCuenta = {
  id: string;
  banco: string;
  tipo: CuentaBancaria["tipo"];
  numero: string;
  titular: string;
};

const configuracionInicial: Configuracion = {
  cuentas: [
    {
      id: "demo-pichincha",
      banco: "Banco Pichincha",
      tipo: "Corriente",
      numero: "DEMO-5432",
      titular: "Cooperativa de ejemplo",
      activa: true,
      predeterminada: true,
    },
    {
      id: "demo-guayaquil",
      banco: "Banco Guayaquil",
      tipo: "Ahorros",
      numero: "DEMO-9876",
      titular: "Cooperativa de ejemplo",
      activa: true,
      predeterminada: false,
    },
    {
      id: "demo-produbanco",
      banco: "Produbanco",
      tipo: "Corriente",
      numero: "DEMO-3210",
      titular: "Cooperativa de ejemplo",
      activa: false,
      predeterminada: false,
    },
  ],
  metodos: [
    {
      codigo: "BANCO",
      nombre: "Transferencia / Depósito",
      descripcion: "Pagos mediante transferencia o depósito bancario.",
      habilitado: true,
      disponible: true,
    },
    {
      codigo: "EFECTIVO",
      nombre: "Pago en oficina",
      descripcion: "Pago presencial en una oficina habilitada.",
      habilitado: true,
      disponible: true,
    },
    {
      codigo: "PAYPHONE",
      nombre: "PayPhone",
      descripcion: "Pagos mediante PayPhone.",
      habilitado: false,
      disponible: false,
      estado: "Pendiente de conexión",
    },
    {
      codigo: "TARJETA",
      nombre: "Tarjeta de crédito / débito",
      descripcion: "Pagos con tarjeta de crédito o débito.",
      habilitado: false,
      disponible: false,
      estado: "Próximamente",
    },
    {
      codigo: "PAYPAL",
      nombre: "PayPal",
      descripcion: "Pagos mediante PayPal.",
      habilitado: false,
      disponible: false,
      estado: "Próximamente",
    },
  ],
  formatos: ["JPG", "PNG", "PDF"],
  maximoMB: 5,
};

const formularioVacio: FormularioCuenta = {
  id: "",
  banco: "",
  tipo: "Corriente",
  numero: "",
  titular: "",
};

function numeroOculto(numero: string) {
  return `•••• ${numero.slice(-4)}`;
}

function estiloBanco(banco: string) {
  if (banco === "Banco Pichincha") {
    return "bg-yellow-300 text-blue-950";
  }

  if (banco === "Banco Guayaquil") {
    return "bg-pink-700 text-white";
  }

  return "bg-emerald-800 text-white";
}

export default function ConfiguracionPagosPage() {
  const [configuracion, setConfiguracion] =
    useState<Configuracion>(configuracionInicial);
  const [guardada, setGuardada] = useState<Configuracion>(configuracionInicial);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [agregandoCuenta, setAgregandoCuenta] = useState(false);
  const [formulario, setFormulario] =
    useState<FormularioCuenta>(formularioVacio);
  const [errorCuenta, setErrorCuenta] = useState("");
  const [cuentaVistaPrevia, setCuentaVistaPrevia] = useState(
    configuracionInicial.cuentas[0].id,
  );

  const panel = "min-w-0 rounded-lg border border-blue-100 bg-white p-4";

  const botonSecundario =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-900 transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

  const campo =
    "mt-1 min-h-11 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  const cuentasActivas = configuracion.cuentas.filter(
    (cuenta) => cuenta.activa,
  );

  const transferenciaHabilitada = configuracion.metodos.some(
    (metodo) => metodo.codigo === "BANCO" && metodo.habilitado,
  );

  const cuentaPrevia =
    cuentasActivas.find((cuenta) => cuenta.id === cuentaVistaPrevia) ??
    cuentasActivas.find((cuenta) => cuenta.predeterminada) ??
    cuentasActivas[0];

  function limpiarMensajes() {
    setMensaje("");
    setError("");
  }

  function cambiarEstadoCuenta(id: string) {
    limpiarMensajes();

    setConfiguracion((actual) => ({
      ...actual,
      cuentas: actual.cuentas.map((cuenta) =>
        cuenta.id === id
          ? {
              ...cuenta,
              activa: !cuenta.activa,
              predeterminada: cuenta.activa ? false : cuenta.predeterminada,
            }
          : cuenta,
      ),
    }));
  }

  function establecerPredeterminada(id: string) {
    limpiarMensajes();

    setConfiguracion((actual) => ({
      ...actual,
      cuentas: actual.cuentas.map((cuenta) => ({
        ...cuenta,
        predeterminada: cuenta.activa && cuenta.id === id,
      })),
    }));
  }

  function cambiarMetodo(codigo: string) {
    limpiarMensajes();

    setConfiguracion((actual) => ({
      ...actual,
      metodos: actual.metodos.map((metodo) =>
        metodo.codigo === codigo && metodo.disponible
          ? { ...metodo, habilitado: !metodo.habilitado }
          : metodo,
      ),
    }));
  }

  function cambiarFormato(formato: string) {
    limpiarMensajes();

    setConfiguracion((actual) => ({
      ...actual,
      formatos: actual.formatos.includes(formato)
        ? actual.formatos.filter((item) => item !== formato)
        : [...actual.formatos, formato],
    }));
  }

  function abrirFormulario(cuenta?: CuentaBancaria) {
    setFormulario(
      cuenta
        ? {
            id: cuenta.id,
            banco: cuenta.banco,
            tipo: cuenta.tipo,
            numero: cuenta.numero,
            titular: cuenta.titular,
          }
        : { ...formularioVacio },
    );

    setErrorCuenta("");
    setModalAbierto(true);
  }

  function guardarCuenta(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const datos = {
      ...formulario,
      numero: formulario.numero.trim(),
      titular: formulario.titular.trim(),
    };

    if (!datos.banco || !datos.numero || !datos.titular) {
      setErrorCuenta("Completa el banco, número de cuenta y titular.");
      return;
    }

    const duplicada = configuracion.cuentas.some(
      (cuenta) =>
        cuenta.id !== datos.id &&
        cuenta.banco === datos.banco &&
        cuenta.tipo === datos.tipo &&
        cuenta.numero.toLowerCase() === datos.numero.toLowerCase(),
    );

    if (duplicada) {
      setErrorCuenta("Esta cuenta bancaria ya está agregada.");
      return;
    }

    limpiarMensajes();

    setConfiguracion((actual) => ({
      ...actual,
      cuentas: datos.id
        ? actual.cuentas.map((cuenta) =>
            cuenta.id === datos.id ? { ...cuenta, ...datos } : cuenta,
          )
        : [
            ...actual.cuentas,
            {
              ...datos,
              id: crypto.randomUUID(),
              activa: false,
              predeterminada: false,
            },
          ],
    }));

    setModalAbierto(false);
    setMensaje(
      datos.id
        ? "Cuenta actualizada en la vista previa. Guarda la configuración para conservar el cambio en esta sesión."
        : "Cuenta agregada como inactiva. Revisa sus datos antes de activarla.",
    );
  }

  function agregarCuenta(datos: DatosCuentaBancaria): string | undefined {
    const duplicada = configuracion.cuentas.some(
      (cuenta) =>
        cuenta.banco.trim().toLowerCase() === datos.banco.trim().toLowerCase() &&
        cuenta.tipo === datos.tipo &&
        cuenta.numero === datos.numero,
    );

    if (duplicada) return "Esta cuenta bancaria ya está agregada.";

    const nuevaCuenta = { ...datos, id: crypto.randomUUID() };
    setConfiguracion((actual) => ({
      ...actual,
      cuentas: [
        ...actual.cuentas.map((cuenta) =>
          datos.predeterminada ? { ...cuenta, predeterminada: false } : cuenta,
        ),
        nuevaCuenta,
      ],
    }));
    if (datos.activa) setCuentaVistaPrevia(nuevaCuenta.id);
    setAgregandoCuenta(false);
    setError("");
    setMensaje("Cuenta agregada. Guarda la configuración para conservar los cambios en esta sesión de prueba.");
  }

  function guardarConfiguracion() {
    limpiarMensajes();

    if (transferenciaHabilitada && cuentasActivas.length === 0) {
      setError(
        "Activa al menos una cuenta bancaria para habilitar Transferencia / Depósito.",
      );
      return;
    }

    if (transferenciaHabilitada && configuracion.formatos.length === 0) {
      setError("Selecciona al menos un formato de comprobante.");
      return;
    }

    setGuardada(configuracion);
    setMensaje(
      "Configuración conservada en esta sesión de prueba. Todavía no se guarda en la base de datos.",
    );
  }

  function cancelarCambios() {
    setConfiguracion(guardada);
    setError("");
    setMensaje("Se restauró la última configuración guardada en esta sesión.");
  }

  if (agregandoCuenta) {
    return (
      <section className="mx-auto my-6 max-w-7xl rounded-lg bg-white p-4 text-blue-950 sm:p-6">
        <FormularioCuentaBancaria
          onGuardar={agregarCuenta}
          onCancelar={() => setAgregandoCuenta(false)}
        />
      </section>
    );
  }

  return (
    <section className="mx-auto my-6 max-w-7xl rounded-lg bg-white p-4 text-blue-950 sm:p-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold sm:text-3xl">
          Configuración de pagos
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Configura los métodos de pago y las cuentas receptoras de la
          cooperativa.
        </p>
      </header>

      <div className="mb-5 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Vista previa con datos de demostración. No utilices estas cuentas para
        realizar pagos.
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
        <section className={panel} aria-labelledby="titulo-cuentas">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="titulo-cuentas" className="text-lg font-bold">
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
                setAgregandoCuenta(true);
              }}
            >
              <span aria-hidden="true">＋</span>
              Agregar cuenta bancaria
            </button>
          </div>

          <div className="mt-4 space-y-3">
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
                  QR bancario: {cuenta.qr ? `imagen adjunta (${cuenta.qr.name})` : "sin configurar"}
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
          <h2 id="titulo-metodos" className="text-lg font-bold">
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
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{metodo.nombre}</h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {metodo.descripcion}
                  </p>

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
            Agregar una pasarela requiere su integración técnica. Por ahora,
            PayPhone, tarjeta y PayPal permanecen deshabilitados.
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
              {["JPG", "PNG", "PDF"].map((formato) => (
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
                <option value={1}>1 MB</option>
                <option value={2}>2 MB</option>
                <option value={5}>5 MB</option>
              </select>
            </label>

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
          className="min-h-11 rounded-md bg-red-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
        >
          Guardar configuración
        </button>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4">
          <dialog
            open
            aria-labelledby="titulo-formulario-cuenta"
            onCancel={(evento) => {
              evento.preventDefault();
              setModalAbierto(false);
            }}
            className="relative mx-auto my-8 w-full max-w-lg rounded-xl bg-white p-5 text-blue-950 shadow-xl sm:my-16 sm:p-6"
          >
            <h2 id="titulo-formulario-cuenta" className="text-xl font-bold">
              {formulario.id
                ? "Editar cuenta bancaria"
                : "Agregar cuenta bancaria"}
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Formulario provisional para probar esta vista con datos de
              ejemplo.
            </p>

            <form onSubmit={guardarCuenta} className="mt-5 space-y-4">
              <label className="block text-sm font-semibold">
                Banco
                <select
                  autoFocus
                  required
                  value={formulario.banco}
                  onChange={(evento) =>
                    setFormulario((actual) => ({
                      ...actual,
                      banco: evento.target.value,
                    }))
                  }
                  className={campo}
                >
                  <option value="">Selecciona un banco</option>
                  <option value="Banco Pichincha">Banco Pichincha</option>
                  <option value="Banco Guayaquil">Banco Guayaquil</option>
                  <option value="Produbanco">Produbanco</option>
                  {!["Banco Pichincha", "Banco Guayaquil", "Produbanco"].includes(formulario.banco) && (
                    <option value={formulario.banco}>{formulario.banco}</option>
                  )}
                </select>
              </label>

              <label className="block text-sm font-semibold">
                Tipo de cuenta
                <select
                  value={formulario.tipo}
                  onChange={(evento) =>
                    setFormulario((actual) => ({
                      ...actual,
                      tipo: evento.target.value as CuentaBancaria["tipo"],
                    }))
                  }
                  className={campo}
                >
                  <option value="Corriente">Corriente</option>
                  <option value="Ahorros">Ahorros</option>
                </select>
              </label>

              <label className="block text-sm font-semibold">
                Número de cuenta
                <input
                  required
                  maxLength={50}
                  value={formulario.numero}
                  onChange={(evento) =>
                    setFormulario((actual) => ({
                      ...actual,
                      numero: evento.target.value,
                    }))
                  }
                  placeholder="Ej. DEMO-5432"
                  className={campo}
                />
              </label>

              <label className="block text-sm font-semibold">
                Titular
                <input
                  required
                  maxLength={200}
                  value={formulario.titular}
                  onChange={(evento) =>
                    setFormulario((actual) => ({
                      ...actual,
                      titular: evento.target.value,
                    }))
                  }
                  className={campo}
                />
              </label>

              {errorCuenta && (
                <p
                  role="alert"
                  className="rounded-md bg-red-50 p-3 text-sm text-red-800"
                >
                  {errorCuenta}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className={botonSecundario}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="min-h-10 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  {formulario.id ? "Actualizar cuenta" : "Agregar cuenta"}
                </button>
              </div>
            </form>
          </dialog>
        </div>
      )}
    </section>
  );
}
