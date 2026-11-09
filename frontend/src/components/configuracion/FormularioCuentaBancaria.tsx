import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

export type DatosCuentaBancaria = {
  banco: string;
  tipo: "Corriente" | "Ahorros";
  numero: string;
  titular: string;
  ruc: string;
  alias: string;
  moneda: "USD";
  activa: boolean;
  predeterminada: boolean;
  qr: File | null;
};

type Props = {
  onGuardar: (cuenta: DatosCuentaBancaria) => string | undefined;
  onCancelar: () => void;
};

const bancos = [
  "Banco Pichincha",
  "Banco Guayaquil",
  "Produbanco",
  "Banco de Machala",
  "Banco del Pacífico",
  "Otro banco",
];

const datosIniciales: DatosCuentaBancaria = {
  banco: "",
  tipo: "Corriente",
  numero: "",
  titular: "",
  ruc: "",
  alias: "",
  moneda: "USD",
  activa: false,
  predeterminada: false,
  qr: null,
};

export default function FormularioCuentaBancaria({
  onGuardar,
  onCancelar,
}: Props) {
  const [datos, setDatos] = useState(datosIniciales);
  const [otroBanco, setOtroBanco] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorQR, setErrorQR] = useState("");
  const [vistaQR, setVistaQR] = useState("");

  const archivoRef = useRef<HTMLInputElement>(null);

  const nombreBanco =
    datos.banco === "Otro banco" ? otroBanco.trim() : datos.banco;

  const campo =
    "mt-1 block min-h-11 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  const panel = "min-w-0 rounded-lg border border-blue-100 bg-white p-4 sm:p-5";

  const botonSecundario =
    "inline-flex min-h-11 items-center justify-center rounded-md border border-blue-300 bg-white px-5 py-2 text-sm font-medium text-blue-800 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

  useEffect(() => {
    if (!datos.qr) {
      setVistaQR("");
      return;
    }

    const url = URL.createObjectURL(datos.qr);
    setVistaQR(url);

    return () => URL.revokeObjectURL(url);
  }, [datos.qr]);

  function actualizar<K extends keyof DatosCuentaBancaria>(
    campoNombre: K,
    valor: DatosCuentaBancaria[K],
  ) {
    setDatos((actual) => ({
      ...actual,
      [campoNombre]: valor,
    }));

    setErrores((actual) => ({
      ...actual,
      [campoNombre]: "",
    }));
  }

  function seleccionarQR(archivo?: File) {
    setErrorQR("");

    if (!archivo) return;

    if (!["image/jpeg", "image/png"].includes(archivo.type)) {
      setErrorQR("Selecciona una imagen JPG o PNG.");

      if (archivoRef.current) {
        archivoRef.current.value = "";
      }

      return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
      setErrorQR("La imagen no puede superar los 5 MB.");

      if (archivoRef.current) {
        archivoRef.current.value = "";
      }

      return;
    }

    actualizar("qr", archivo);
  }

  function quitarQR() {
    actualizar("qr", null);
    setErrorQR("");

    if (archivoRef.current) {
      archivoRef.current.value = "";
    }
  }

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const nuevosErrores: Record<string, string> = {};

    if (!nombreBanco) {
      nuevosErrores.banco = "Selecciona o escribe el banco.";
    }

    if (!/^\d{4,50}$/.test(datos.numero.trim())) {
      nuevosErrores.numero =
        "Ingresa entre 4 y 50 dígitos, sin espacios ni guiones.";
    }

    if (!datos.titular.trim()) {
      nuevosErrores.titular = "Ingresa el titular de la cuenta.";
    }

    if (!/^\d{13}$/.test(datos.ruc.trim())) {
      nuevosErrores.ruc = "El RUC debe contener 13 dígitos.";
    }

    setErrores(nuevosErrores);

    if (Object.keys(nuevosErrores).length > 0) {
      return;
    }

    const errorGuardado = onGuardar({
      ...datos,
      banco: nombreBanco,
      numero: datos.numero.trim(),
      titular: datos.titular.trim(),
      ruc: datos.ruc.trim(),
      alias: datos.alias.trim(),
      predeterminada: datos.activa && datos.predeterminada,
    });

    if (errorGuardado) setErrores({ numero: errorGuardado });
  }

  function mensajeError(nombre: string) {
    return errores[nombre] ? (
      <p id={`error-${nombre}`} className="mt-1 text-xs text-red-700">
        {errores[nombre]}
      </p>
    ) : null;
  }

  return (
    <form onSubmit={guardar} noValidate className="text-blue-950">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="titulo-formulario-cuenta" className="text-2xl font-bold">
            Agregar cuenta bancaria
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Registra una cuenta bancaria para recibir pagos por transferencias o
            depósitos.
          </p>
        </div>

        <button type="button" onClick={onCancelar} className={botonSecundario}>
          ← Volver a Pagos
        </button>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className={panel} aria-labelledby="datos-cuenta">
          <h3 id="datos-cuenta" className="text-lg font-bold">
            Datos de la cuenta bancaria
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            Completa la información de la cuenta para recibir pagos de tus
            clientes.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="banco-cuenta" className="text-sm font-medium">
                Banco <span className="text-red-600">*</span>
              </label>

              <select
                id="banco-cuenta"
                value={datos.banco}
                onChange={(evento) => actualizar("banco", evento.target.value)}
                required
                aria-invalid={Boolean(errores.banco)}
                aria-describedby={errores.banco ? "error-banco" : undefined}
                className={campo}
              >
                <option value="">Selecciona un banco</option>

                {bancos.map((banco) => (
                  <option key={banco} value={banco}>
                    {banco}
                  </option>
                ))}
              </select>

              {mensajeError("banco")}
            </div>

            <div>
              <label htmlFor="tipo-cuenta" className="text-sm font-medium">
                Tipo de cuenta <span className="text-red-600">*</span>
              </label>

              <select
                id="tipo-cuenta"
                value={datos.tipo}
                onChange={(evento) =>
                  actualizar(
                    "tipo",
                    evento.target.value as DatosCuentaBancaria["tipo"],
                  )
                }
                required
                className={campo}
              >
                <option value="Corriente">Corriente</option>
                <option value="Ahorros">Ahorros</option>
              </select>
            </div>

            {datos.banco === "Otro banco" && (
              <div className="sm:col-span-2">
                <label
                  htmlFor="nombre-otro-banco"
                  className="text-sm font-medium"
                >
                  Nombre del banco <span className="text-red-600">*</span>
                </label>

                <input
                  id="nombre-otro-banco"
                  value={otroBanco}
                  onChange={(evento) => {
                    setOtroBanco(evento.target.value);
                    setErrores((actual) => ({
                      ...actual,
                      banco: "",
                    }));
                  }}
                  maxLength={100}
                  required
                  aria-invalid={Boolean(errores.banco)}
                  aria-describedby={errores.banco ? "error-banco" : undefined}
                  placeholder="Escribe el nombre del banco"
                  className={campo}
                />
              </div>
            )}

            <div>
              <label htmlFor="numero-cuenta" className="text-sm font-medium">
                Número de cuenta <span className="text-red-600">*</span>
              </label>

              <input
                id="numero-cuenta"
                value={datos.numero}
                onChange={(evento) => actualizar("numero", evento.target.value)}
                inputMode="numeric"
                maxLength={50}
                required
                aria-invalid={Boolean(errores.numero)}
                aria-describedby={errores.numero ? "error-numero" : undefined}
                placeholder="Ingresa el número"
                className={campo}
              />

              {mensajeError("numero")}
            </div>

            <div>
              <label htmlFor="titular-cuenta" className="text-sm font-medium">
                Titular de la cuenta <span className="text-red-600">*</span>
              </label>

              <input
                id="titular-cuenta"
                value={datos.titular}
                onChange={(evento) =>
                  actualizar("titular", evento.target.value)
                }
                maxLength={200}
                required
                aria-invalid={Boolean(errores.titular)}
                aria-describedby={errores.titular ? "error-titular" : undefined}
                placeholder="Nombre del titular"
                className={campo}
              />

              {mensajeError("titular")}
            </div>

            <div>
              <label htmlFor="ruc-cuenta" className="text-sm font-medium">
                RUC de la cooperativa <span className="text-red-600">*</span>
              </label>

              <input
                id="ruc-cuenta"
                value={datos.ruc}
                onChange={(evento) => actualizar("ruc", evento.target.value)}
                inputMode="numeric"
                maxLength={13}
                required
                aria-invalid={Boolean(errores.ruc)}
                aria-describedby={errores.ruc ? "error-ruc" : undefined}
                placeholder="Ingresa los 13 dígitos"
                className={campo}
              />

              {mensajeError("ruc")}
            </div>

            <div>
              <label htmlFor="alias-cuenta" className="text-sm font-medium">
                Alias (opcional)
              </label>

              <input
                id="alias-cuenta"
                value={datos.alias}
                onChange={(evento) => actualizar("alias", evento.target.value)}
                maxLength={100}
                placeholder="Ej. Cuenta principal"
                className={campo}
              />
            </div>

            <div>
              <label htmlFor="moneda-cuenta" className="text-sm font-medium">
                Moneda
              </label>

              <input
                id="moneda-cuenta"
                value="USD"
                readOnly
                className={`${campo} bg-slate-100 text-slate-600`}
              />
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div className="flex items-start gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={datos.activa}
                aria-labelledby="etiqueta-cuenta-activa"
                onClick={() =>
                  setDatos((actual) => ({
                    ...actual,
                    activa: !actual.activa,
                    predeterminada: actual.activa
                      ? false
                      : actual.predeterminada,
                  }))
                }
                className={`relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  datos.activa ? "bg-blue-600" : "bg-slate-300"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    datos.activa ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>

              <div>
                <p id="etiqueta-cuenta-activa" className="text-sm font-medium">
                  Cuenta activa
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Esta cuenta estará disponible para recibir pagos.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={datos.predeterminada}
                disabled={!datos.activa}
                onChange={(evento) =>
                  actualizar("predeterminada", evento.target.checked)
                }
                className="mt-0.5 h-5 w-5 accent-blue-600 disabled:cursor-not-allowed"
              />

              <span>
                <span className="block text-sm font-medium">
                  Usar como predeterminada
                </span>

                <span className="mt-1 block text-xs text-slate-500">
                  Activa la cuenta para poder seleccionarla como predeterminada.
                </span>
              </span>
            </label>
          </div>
        </section>

        <div className="space-y-4">
          <section className={panel} aria-labelledby="titulo-qr">
            <h3 id="titulo-qr" className="text-lg font-bold">
              QR de cobro <span className="font-normal">(opcional)</span>
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              Sube el código QR proporcionado por el banco.
            </p>

            <input
              ref={archivoRef}
              id="archivo-qr"
              type="file"
              accept="image/jpeg,image/png"
              onChange={(evento) => seleccionarQR(evento.target.files?.[0])}
              className="mt-4 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-800 hover:file:bg-blue-100"
            />

            <p className="mt-2 text-xs text-slate-500">
              JPG o PNG, máximo 5 MB.
            </p>

            {vistaQR && (
              <div className="mt-4 rounded-lg border border-dashed border-blue-300 bg-blue-50/40 p-4 text-center">
                <img
                  src={vistaQR}
                  alt="Vista previa del QR adjunto"
                  className="mx-auto h-40 w-40 object-contain"
                />

                <p className="mt-2 break-all text-xs text-slate-600">
                  {datos.qr?.name}
                </p>

                <button
                  type="button"
                  onClick={quitarQR}
                  className="mt-3 text-sm font-medium text-red-700 underline"
                >
                  Quitar imagen
                </button>
              </div>
            )}

            {errorQR && (
              <p role="alert" className="mt-2 text-sm text-red-700">
                {errorQR}
              </p>
            )}

            <p className="mt-4 rounded-md bg-blue-50 p-3 text-xs leading-5 text-blue-800">
              Comprueba que el QR corresponda a esta cuenta. Adjuntar una imagen
              no verifica su contenido.
            </p>
          </section>

          <section className={panel} aria-labelledby="titulo-previa">
            <h3 id="titulo-previa" className="text-lg font-bold">
              Vista previa de la cuenta
            </h3>

            <p className="mt-2 text-xs text-slate-500">
              Completa los datos para visualizar la información.
            </p>

            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/40 p-4">
              <h4 className="font-bold">{nombreBanco || "Nombre del banco"}</h4>

              <dl className="mt-3 divide-y divide-blue-100 text-sm">
                {[
                  ["Tipo de cuenta", datos.tipo],
                  ["Número de cuenta", datos.numero || "—"],
                  ["Titular", datos.titular || "—"],
                  ["RUC", datos.ruc || "—"],
                  ["Alias", datos.alias || "—"],
                  ["Moneda", datos.moneda],
                ].map(([etiqueta, valor]) => (
                  <div
                    key={etiqueta}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-3 py-2"
                  >
                    <dt className="text-slate-600">{etiqueta}</dt>
                    <dd className="break-words font-medium">{valor}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        </div>
      </div>

      <div className="mt-5 flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <button type="button" onClick={onCancelar} className={botonSecundario}>
          Cancelar
        </button>

        <button
          type="submit"
          className="min-h-11 rounded-md bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        >
          Guardar cuenta
        </button>
      </div>
    </form>
  );
}
