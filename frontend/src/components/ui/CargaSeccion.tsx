import { useEffect, useState } from 'react';

/** Evita parpadeos en cargas rápidas: solo muestra el indicador si supera `retrasoMs` (250 ms). */
export function useMostrarCarga(cargando: boolean, retrasoMs = 250): boolean {
  const [mostrar, setMostrar] = useState(false);
  useEffect(() => {
    if (!cargando) {
      setMostrar(false);
      return;
    }
    const timer = setTimeout(() => setMostrar(true), retrasoMs);
    return () => clearTimeout(timer);
  }, [cargando, retrasoMs]);
  return mostrar;
}

export function CargaSeccion({ retraso = false }: { retraso?: boolean }) {
  const visible = useMostrarCarga(true, retraso ? 250 : 0);
  if (retraso && !visible) return null;
  return (
    <div role="status" aria-live="polite" className="space-y-4 py-5 text-blue-900">
      <span className="sr-only">Cargando sección…</span>
      <div aria-hidden="true" className="h-7 w-60 animate-pulse rounded bg-blue-100/80" />
      <div aria-hidden="true" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="h-20 animate-pulse rounded-lg border border-blue-50 bg-slate-100/80" />
        <div className="h-20 animate-pulse rounded-lg border border-blue-50 bg-slate-100/80" />
        <div className="h-20 animate-pulse rounded-lg border border-blue-50 bg-slate-100/80" />
        <div className="h-20 animate-pulse rounded-lg border border-blue-50 bg-slate-100/80" />
      </div>
      <div aria-hidden="true" className="h-44 animate-pulse rounded-lg border border-blue-50 bg-slate-100/70" />
    </div>
  );
}
