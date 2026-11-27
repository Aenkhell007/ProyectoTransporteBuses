import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface OpcionCombo {
  valor: string;
  etiqueta: string;
  subtitulo?: string;
}

interface ComboBusquedaProps {
  id?: string;
  value: string;
  onChange: (valor: string) => void;
  opciones: OpcionCombo[];
  placeholder?: string;
  disabled?: boolean;
  permitirLibre?: boolean;
  className?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
}

const normalizarBusqueda = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/** ComboBox ligero con búsqueda rápida sin tildes, navegación por teclado y portal anti-recorte. */
export function ComboBusqueda({
  id,
  value,
  onChange,
  opciones,
  placeholder = 'Buscar…',
  disabled = false,
  permitirLibre = false,
  className = '',
  ariaInvalid,
  ariaDescribedBy,
}: ComboBusquedaProps) {
  const autoId = useId();
  const listId = `${id ?? autoId}-lista`;
  const contenedor = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const actual = useMemo(() => opciones.find((o) => o.valor === value), [opciones, value]);
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState(actual ? actual.etiqueta : value);
  const [activo, setActivo] = useState(0);
  const [coords, setCoords] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  } | null>(null);

  useEffect(() => {
    setTexto(actual ? actual.etiqueta : permitirLibre ? value : '');
  }, [actual, value, permitirLibre]);

  const recalcularPosicion = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const espacioAbajo = window.innerHeight - rect.bottom - 8;
    const espacioArriba = rect.top - 8;
    const abrirArriba = espacioAbajo < 200 && espacioArriba > espacioAbajo;
    const width = Math.min(Math.max(rect.width, 260), window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    if (abrirArriba) {
      setCoords({
        left,
        width,
        bottom: window.innerHeight - rect.top + 4,
        maxHeight: Math.min(260, Math.max(120, espacioArriba)),
      });
    } else {
      setCoords({
        left,
        width,
        top: rect.bottom + 4,
        maxHeight: Math.min(260, Math.max(120, espacioAbajo)),
      });
    }
  }, []);

  useEffect(() => {
    if (!abierto || disabled) return;
    recalcularPosicion();
    const actualizar = () => recalcularPosicion();
    window.addEventListener('scroll', actualizar, true);
    window.addEventListener('resize', actualizar);
    return () => {
      window.removeEventListener('scroll', actualizar, true);
      window.removeEventListener('resize', actualizar);
    };
  }, [abierto, disabled, recalcularPosicion]);

  useEffect(() => {
    function fuera(e: MouseEvent) {
      const target = e.target as Node;
      if (
        contenedor.current?.contains(target) ||
        listaRef.current?.contains(target)
      ) {
        return;
      }
      setAbierto(false);
      if (!permitirLibre) setTexto(actual ? actual.etiqueta : '');
    }
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [actual, permitirLibre]);

  const filtradas = useMemo(() => {
    const q = normalizarBusqueda(texto.trim());
    if (!q || (actual && q === normalizarBusqueda(actual.etiqueta))) return opciones;
    return opciones.filter(
      (o) =>
        normalizarBusqueda(o.etiqueta).includes(q) ||
        (o.subtitulo && normalizarBusqueda(o.subtitulo).includes(q)),
    );
  }, [opciones, texto, actual]);

  function elegir(op: OpcionCombo) {
    onChange(op.valor);
    setTexto(op.etiqueta);
    setAbierto(false);
  }

  const menu =
    abierto && !disabled && coords ? (
      <ul
        ref={listaRef}
        id={listId}
        role="listbox"
        style={{
          position: 'fixed',
          left: `${coords.left}px`,
          width: `${coords.width}px`,
          ...(coords.top !== undefined ? { top: `${coords.top}px` } : {}),
          ...(coords.bottom !== undefined ? { bottom: `${coords.bottom}px` } : {}),
          maxHeight: `${coords.maxHeight}px`,
          zIndex: 9999,
        }}
        className="overflow-y-auto rounded-md border border-slate-200 bg-white py-1 text-sm shadow-xl"
      >
        {filtradas.length === 0 ? (
          <li className="px-3 py-2 text-xs text-slate-500">Sin coincidencias</li>
        ) : (
          filtradas.map((op, i) => (
            <li
              key={op.valor}
              role="option"
              aria-selected={op.valor === value}
              onMouseDown={(e) => {
                e.preventDefault();
                elegir(op);
              }}
              onMouseEnter={() => setActivo(i)}
              className={`cursor-pointer px-3 py-2 ${
                i === activo ? 'bg-blue-50 text-blue-950' : 'text-slate-800'
              } ${op.valor === value ? 'font-semibold' : ''}`}
            >
              <span className="block">{op.etiqueta}</span>
              {op.subtitulo && (
                <span className="block text-xs text-slate-500">{op.subtitulo}</span>
              )}
            </li>
          ))
        )}
      </ul>
    ) : null;

  return (
    <div ref={contenedor} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={abierto}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        placeholder={placeholder}
        value={texto}
        className={className}
        onFocus={() => {
          setAbierto(true);
          setActivo(0);
          recalcularPosicion();
        }}
        onChange={(e) => {
          const v = e.target.value;
          setTexto(v);
          setAbierto(true);
          setActivo(0);
          recalcularPosicion();
          if (permitirLibre) onChange(v);
          else if (!v.trim()) onChange('');
        }}
        onKeyDown={(e) => {
          if (!abierto && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setAbierto(true);
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActivo((i) => Math.min(filtradas.length - 1, i + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActivo((i) => Math.max(0, i - 1));
          } else if (e.key === 'Enter' && abierto && filtradas[activo]) {
            e.preventDefault();
            elegir(filtradas[activo]);
          } else if (e.key === 'Escape') {
            setAbierto(false);
            if (!permitirLibre) setTexto(actual ? actual.etiqueta : '');
          }
        }}
      />
      {menu && (typeof document !== 'undefined' ? createPortal(menu, document.body) : menu)}
    </div>
  );
}
