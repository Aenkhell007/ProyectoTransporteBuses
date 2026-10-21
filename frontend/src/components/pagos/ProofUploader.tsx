import { useEffect, useId, useRef, useState } from "react";
import type { DragEvent } from "react";
import { ACCEPT_COMPROBANTE, validarComprobante } from "../../features/pagos/validarComprobante";
import type { ComprobanteLocal } from "../../features/pagos/validarComprobante";

interface Props {
  value: ComprobanteLocal | null;
  onChange: (value: ComprobanteLocal | null) => void;
  onValidando: (validando: boolean) => void;
}

export default function ProofUploader({ value, onChange, onValidando }: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const peticion = useRef(0);
  const [error, setError] = useState("");
  const [validando, setValidando] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!value) { setPreview(""); return; }
    const url = URL.createObjectURL(value.archivo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  useEffect(() => () => { peticion.current += 1; }, []);

  async function seleccionar(archivos: File[]) {
    const actual = ++peticion.current;
    setError("");
    setValidando(true);
    onValidando(true);
    onChange(null);
    try {
      const comprobante = await validarComprobante(archivos);
      if (actual === peticion.current) onChange(comprobante);
    } catch (e) {
      if (actual === peticion.current) setError(e instanceof Error ? e.message : "No se pudo leer el archivo.");
    } finally {
      if (actual === peticion.current) { setValidando(false); onValidando(false); }
    }
  }

  function quitar() {
    peticion.current += 1;
    setError("");
    setValidando(false);
    onValidando(false);
    onChange(null);
    if (input.current) input.current.value = "";
  }

  function soltar(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setArrastrando(false);
    void seleccionar(Array.from(event.dataTransfer.files));
  }

  return <div className="space-y-4">
    <div
      onDragOver={(event) => { event.preventDefault(); setArrastrando(true); }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setArrastrando(false); }}
      onDrop={soltar}
      aria-busy={validando}
      className={`flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-5 text-center sm:p-8 ${arrastrando ? "border-blue-600 bg-blue-100" : "border-blue-200 bg-blue-50/50"}`}
    >
      <svg aria-hidden="true" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-700">
        <path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" />
      </svg>
      <p className="font-semibold text-blue-950">Arrastra aquí tu comprobante</p>
      <p id={`${id}-ayuda`} className="text-sm text-slate-600">Un archivo JPG, PNG o PDF · máximo 5 MB</p>
      <input ref={input} id={id} type="file" accept={ACCEPT_COMPROBANTE}
        aria-label="Seleccionar comprobante" aria-describedby={`${id}-ayuda ${id}-error`}
        className="sr-only" tabIndex={-1}
        onChange={(event) => {
          const archivos = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (archivos.length) void seleccionar(archivos);
        }} />
      <button type="button" onClick={() => input.current?.click()} className="min-h-11 rounded-md border border-blue-300 bg-white px-5 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-600">
        {value ? "Cambiar comprobante" : "Seleccionar archivo"}
      </button>
      <p role="status" className="text-sm text-blue-800">{validando ? "Validando archivo…" : ""}</p>
    </div>
    <p id={`${id}-error`} role="alert" className={error ? "rounded-md bg-red-50 p-3 text-sm text-red-800" : "sr-only"}>{error}</p>
    {value && <section aria-label="Archivo seleccionado" className="overflow-hidden rounded-lg border border-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4">
        <div className="min-w-0 flex-1">
          <p className="break-all text-sm font-semibold text-blue-950">{value.archivo.name}</p>
          <p className="mt-1 text-xs text-slate-600">{(value.archivo.size / 1024).toLocaleString("es-EC", { maximumFractionDigits: 1 })} KB · {value.mime === "application/pdf" ? "PDF" : "Imagen"}</p>
        </div>
        <button type="button" onClick={quitar} className="min-h-11 rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-600">Quitar archivo</button>
      </div>
      {preview && (value.mime === "application/pdf" ? (
        <div className="p-4">
          <object data={preview} type="application/pdf" aria-label="Vista previa del comprobante PDF" className="h-80 w-full rounded border border-slate-200"><p className="p-4 text-sm text-slate-600">Tu navegador no muestra la vista previa del PDF. Puedes abrirlo con el enlace inferior.</p></object>
          <a href={preview} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm text-blue-700 underline">Abrir PDF en otra pestaña</a>
        </div>
      ) : (
        <img src={preview} alt="Vista previa del comprobante seleccionado" className="mx-auto max-h-96 w-full bg-white object-contain p-4" onError={() => { quitar(); setError("No se puede mostrar la imagen. Elige un archivo que no esté dañado."); }} />
      ))}
      <p className="border-t border-slate-100 p-3 text-xs text-slate-500">Vista previa local. El archivo todavía no se ha enviado.</p>
    </section>}
  </div>;
}
