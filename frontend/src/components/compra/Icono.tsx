// Compatibilidad con los nombres usados en las vistas de compra y paneles.
import {IconoBiblioteca} from '../ui/IconoBiblioteca';
export type NombreIcono = 'dinero' | 'oficina' | 'grafico' | 'ubicacion' | 'intercambiar' | 'calendario' | 'persona' | 'personas' | 'lupa' | 'montana' | 'asiento' | 'escudo' | 'soporte' | 'corona' | 'bus' | 'clima' | 'wifi' | 'bano' | 'comida' | 'enchufe' | 'pantalla' | 'maleta' | 'flechaDerecha' | 'flechaIzquierda' | 'chevronAbajo' | 'chevronArriba' | 'chevronDerecha' | 'chevronIzquierda' | 'whatsapp' | 'correo' | 'enviar' | 'externo' | 'check' | 'checkCirculo' | 'xCirculo' | 'cerrar' | 'info' | 'alerta' | 'reloj' | 'filtros' | 'ordenar' | 'editar' | 'porcentaje' | 'documento' | 'calculadora' | 'boleto' | 'descarga' | 'usuarioCuenta' | 'accesibilidad' | 'papelera' | 'inicio' | 'ruta' | 'guardar' | 'clave' | 'telefono' | 'salir' | 'mas';
export function Icono({nombre, className, titulo}: {nombre: NombreIcono; className?: string; titulo?: string}) {
  return <IconoBiblioteca nombre={nombre} className={className} titulo={titulo}/>;
}
