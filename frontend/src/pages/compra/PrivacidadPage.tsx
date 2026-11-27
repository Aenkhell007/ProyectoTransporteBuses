import { ContenidoPoliticaPrivacidad } from "../../features/privacidad/ContenidoPoliticaPrivacidad";

export function PrivacidadPage() {
  return (
    <article className="mx-auto my-8 max-w-3xl rounded-2xl border border-blue-100 bg-white p-6 shadow-sm sm:p-10">
      <h1 className="mb-5 text-3xl font-bold text-blue-950">
        Política de privacidad de la versión académica
      </h1>
      <div className="space-y-4 leading-relaxed text-slate-700">
        <ContenidoPoliticaPrivacidad />
      </div>
    </article>
  );
}
