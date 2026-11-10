interface EncabezadoSeccionProps {
  antetitulo: string;
  titulo: string;
  descripcion?: string;
  idTitulo?: string;
}

/** Antetítulo rojo entre líneas y título centrado, como en las vistas 1 y 1.1. */
export function EncabezadoSeccion({
  antetitulo,
  titulo,
  descripcion,
  idTitulo,
}: EncabezadoSeccionProps) {
  return (
    <header className="mb-5 text-center">
      <p className="flex items-center justify-center gap-3 text-xs font-semibold tracking-wide text-red-600 uppercase">
        <span aria-hidden="true" className="h-px w-10 bg-red-500 sm:w-14" />
        {antetitulo}
        <span aria-hidden="true" className="h-px w-10 bg-red-500 sm:w-14" />
      </p>
      <h2
        id={idTitulo}
        className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl"
      >
        {titulo}
      </h2>
      {descripcion && (
        <p className="mx-auto mt-1 max-w-2xl text-sm text-slate-600 sm:text-base">
          {descripcion}
        </p>
      )}
    </header>
  );
}
