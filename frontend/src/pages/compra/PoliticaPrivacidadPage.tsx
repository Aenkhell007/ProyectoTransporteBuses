import { Link } from "react-router";
import { Icono } from "../../components/compra/Icono";

export default function PoliticaPrivacidadPage() {
  return (
    <section
      aria-labelledby="privacidad-titulo"
      className="mx-auto my-5 w-[calc(100%-24px)] max-w-4xl space-y-4 rounded-xl bg-white p-5 text-[#08035b] shadow-sm sm:w-[calc(100%-36px)] sm:p-8"
    >
      <header className="border-b border-indigo-100 pb-4">
        <h1 id="privacidad-titulo" className="text-2xl font-bold sm:text-3xl">
          Política de Privacidad
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Gran Continental · Sistema de Transporte Terrestre (Versión académica)
        </p>
      </header>

      <div className="space-y-4 text-sm leading-6 text-slate-700">
        <p>
          La información ingresada en los formularios de registro, compra de
          pasajes, validación de pagos y contacto se utiliza exclusivamente para
          gestionar reservas, emitir boletos electrónicos, atender consultas de
          viaje y verificar identidad al abordar.
        </p>

        <section className="space-y-1.5">
          <h2 className="text-base font-bold text-[#08035b]">
            1. Datos recopilados
          </h2>
          <p>
            Recopilamos únicamente nombres, apellidos, documento de identidad,
            fecha de nacimiento (para validar beneficios tarifarios vigentes),
            correo electrónico, número de contacto y comprobantes de pago
            adjuntados voluntariamente por el usuario.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-base font-bold text-[#08035b]">
            2. Conservación y acceso
          </h2>
          <p>
            Los comprobantes y respaldos adjuntos se almacenan de forma privada
            con acceso restringido al pasajero propietario y al personal
            autorizado de la cooperativa correspondiente.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-base font-bold text-[#08035b]">
            3. Alcance académico
          </h2>
          <p>
            Este entorno corresponde a una versión de demostración y pruebas
            académicas: no procesa cobros bancarios reales ni comparte datos con
            terceros comerciales.
          </p>
        </section>
      </div>

      <div className="border-t border-indigo-100 pt-4">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-indigo-200 px-4 text-sm font-semibold text-blue-800 hover:bg-blue-50"
        >
          <Icono nombre="flechaIzquierda" className="h-4 w-4" />
          Volver al inicio
        </Link>
      </div>
    </section>
  );
}
