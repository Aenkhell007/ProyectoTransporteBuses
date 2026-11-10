import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Bus, BusFormData, GrupoBus } from '../../types/bus';
import { validarBus } from '../../utils/validarBus';
import type { ErroresBus } from '../../utils/validarBus';
import { botonPrimario, botonSecundario, entrada, etiquetaCampo, textoError } from './estilos';

interface BusFormProps {
  grupos: GrupoBus[];
  existentes: Bus[];
  onGuardar: (datos: BusFormData) => void | boolean | Promise<void | boolean>;
  /** Si se pasa un bus, el formulario edita ese bus en lugar de crear uno nuevo. */
  bus?: Bus;
  onCancelar?: () => void;
}

const VACIO: BusFormData = {
  unidad: '',
  placa: '',
  chasis: '',
  carroceria: '',
  grupo_id: '',
  propietario: '',
  correo_contacto: '',
};

function desdeBus(bus: Bus): BusFormData {
  return {
    unidad: bus.unidad,
    placa: bus.placa,
    chasis: bus.chasis,
    carroceria: bus.carroceria,
    grupo_id: bus.grupo_id,
    propietario: bus.propietario ?? '',
    correo_contacto: bus.correo_contacto ?? '',
  };
}

export default function BusForm({ grupos, existentes, onGuardar, bus, onCancelar }: BusFormProps) {
  const [datos, setDatos] = useState<BusFormData>(bus ? desdeBus(bus) : VACIO);
  const [errores, setErrores] = useState<ErroresBus>({});
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState('');

  const cambiar = (campo: keyof BusFormData, valor: string) =>
    setDatos((anterior) => ({ ...anterior, [campo]: valor }));

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (guardando) return;
    const encontrados = validarBus(datos, existentes, bus?.id);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    setGuardando(true);
    setErrorGuardado('');
    try {
      const resultado = await onGuardar({ ...datos, placa: datos.placa.trim().toUpperCase() });
      if (resultado === false) setErrorGuardado('No se guardó el bus. Conservamos los datos para reintentar.');
      else if (!bus) setDatos(VACIO);
    } catch { setErrorGuardado('No se pudo guardar. Conservamos los datos.'); }
    finally { setGuardando(false); }
  };

  const campo = (nombre: keyof BusFormData, etiqueta: string) => (
    <label className={etiquetaCampo}>
      {etiqueta}
      <input
        className={entrada}
        value={datos[nombre]}
        aria-invalid={Boolean(errores[nombre])}
        onChange={(e) => cambiar(nombre, e.target.value)}
      />
      {errores[nombre] && (
        <span className={textoError} role="alert">
          {errores[nombre]}
        </span>
      )}
    </label>
  );

  return (
    <form onSubmit={enviar} noValidate>
      <fieldset disabled={guardando} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {campo('unidad', 'Unidad *')}
      {campo('placa', 'Placa *')}
      {campo('chasis', 'Chasis *')}
      {campo('carroceria', 'Carrocería *')}
      <label className={etiquetaCampo}>
        Grupo *
        <select
          className={entrada}
          value={datos.grupo_id}
          aria-invalid={Boolean(errores.grupo_id)}
          onChange={(e) => cambiar('grupo_id', e.target.value)}
        >
          <option value="">Elige un grupo</option>
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nombre}
            </option>
          ))}
        </select>
        {errores.grupo_id && (
          <span className={textoError} role="alert">
            {errores.grupo_id}
          </span>
        )}
      </label>
      {campo('propietario', 'Propietario')}
      {campo('correo_contacto', 'Correo de contacto')}
      <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
        <button type="submit" className={botonPrimario}>
          {guardando ? 'Guardando…' : bus ? 'Guardar cambios' : 'Agregar bus'}
        </button>
        {bus && onCancelar && (
          <button type="button" className={botonSecundario} onClick={onCancelar}>
            Cancelar
          </button>
        )}
      </div>
      {errorGuardado && <p role="alert" className="text-sm text-red-700 sm:col-span-2 lg:col-span-3">{errorGuardado}</p>}
      </fieldset>
    </form>
  );
}
