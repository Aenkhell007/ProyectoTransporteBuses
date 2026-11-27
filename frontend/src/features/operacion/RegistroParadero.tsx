import { useState, type FormEvent } from 'react';
import { guardarOperacion } from './api';
import { Caja, Campo, campo, primario, type useOperacion } from './ui';

export default function RegistroParadero({ operacion }: { operacion: ReturnType<typeof useOperacion> }) {
  const [ciudadId, setCiudadId] = useState('');
  const [nombre, setNombre] = useState('');
  const { datos } = operacion;
  if (!datos?.permisos.operacion || !datos.cantonesProvincia?.length) return null;

  const { id: cooperativaId, provincia } = datos.cooperativa;

  async function registrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await operacion.ejecutar(async () => {
      const resultado = await guardarOperacion(
        'paraderos', cooperativaId, { ciudadId, nombre: nombre.trim() }, 'POST',
      );
      setNombre('');
      await operacion.cargar();
      operacion.setMensaje(resultado.mensaje);
    });
  }

  return (
    <Caja titulo="Registrar paradero local" icono="ubicacion">
      <form onSubmit={registrar}>
        <fieldset disabled={operacion.ocupado || operacion.cargando} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Campo nombre={`Cantón de ${provincia}`}>
            <select className={campo} value={ciudadId} onChange={event => setCiudadId(event.target.value)} required>
              <option value="">Selecciona un cantón</option>
              {datos.cantonesProvincia.map(canton => (
                <option key={canton.id} value={canton.id}>{canton.nombre}</option>
              ))}
            </select>
          </Campo>
          <Campo nombre="Nombre del paradero">
            <input className={campo} value={nombre} onChange={event => setNombre(event.target.value)} minLength={2} maxLength={150} required />
          </Campo>
          <button className={primario} type="submit">Registrar paradero</button>
        </fieldset>
      </form>
    </Caja>
  );
}
