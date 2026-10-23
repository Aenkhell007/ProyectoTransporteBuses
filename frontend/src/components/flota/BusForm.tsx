import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Bus, BusFormData, GrupoBus } from '../../types/bus';
import { validarBus } from '../../utils/validarBus';
import type { ErroresBus } from '../../utils/validarBus';

interface BusFormProps {
  grupos: GrupoBus[];
  existentes: Bus[];
  onGuardar: (datos: BusFormData) => void;
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

export default function BusForm({ grupos, existentes, onGuardar }: BusFormProps) {
  const [datos, setDatos] = useState<BusFormData>(VACIO);
  const [errores, setErrores] = useState<ErroresBus>({});

  const cambiar = (campo: keyof BusFormData, valor: string) =>
    setDatos((anterior) => ({ ...anterior, [campo]: valor }));

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    const encontrados = validarBus(datos, existentes);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    onGuardar({ ...datos, placa: datos.placa.trim().toUpperCase() });
    setDatos(VACIO);
  };

  const campo = (nombre: keyof BusFormData, etiqueta: string) => (
    <label className="bus-form__campo">
      {etiqueta}
      <input value={datos[nombre]} onChange={(e) => cambiar(nombre, e.target.value)} />
      {errores[nombre] && <span className="bus-form__error">{errores[nombre]}</span>}
    </label>
  );

  return (
    <form className="bus-form" onSubmit={enviar} noValidate>
      {campo('unidad', 'Unidad *')}
      {campo('placa', 'Placa *')}
      {campo('chasis', 'Chasis *')}
      {campo('carroceria', 'Carrocería *')}
      <label className="bus-form__campo">
        Grupo *
        <select value={datos.grupo_id} onChange={(e) => cambiar('grupo_id', e.target.value)}>
          <option value="">Elige un grupo</option>
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>{g.nombre}</option>
          ))}
        </select>
        {errores.grupo_id && <span className="bus-form__error">{errores.grupo_id}</span>}
      </label>
      {campo('propietario', 'Propietario')}
      {campo('correo_contacto', 'Correo de contacto')}
      <button type="submit">Agregar bus</button>
    </form>
  );
}