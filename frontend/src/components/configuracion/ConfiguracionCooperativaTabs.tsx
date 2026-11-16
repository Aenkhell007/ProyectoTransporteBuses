import {IconoBiblioteca, type NombreIconoBiblioteca} from '../ui/IconoBiblioteca';
import { NavLink, useLocation } from 'react-router';

export function ConfiguracionCooperativaTabs() {
  const pathname=useLocation().pathname;
  const base = pathname.startsWith('/cooperativa') ? '/cooperativa/configuracion' : '/vista-previa/cooperativa/configuracion';
  return <nav aria-label="Secciones de configuración" className="grid grid-cols-3 gap-1 overflow-hidden rounded-lg bg-blue-50 text-center text-xs sm:text-sm">
    {[[base, 'Identidad y contacto', 'identidad'], [`${base}/pagos`, 'Pagos', 'pagos'], [`${base}/tarifas`, 'Tarifas y descuentos', 'tarifas']].map(([ruta, nombre, icono]) => <NavLink key={ruta} to={ruta} end className={({ isActive }) => `flex min-h-12 items-center justify-center gap-2 border-b-2 px-2 py-2 ${isActive || (ruta.endsWith('/tarifas') && pathname.startsWith(ruta+'/')) ? 'border-blue-700 bg-white font-bold' : 'border-transparent hover:bg-blue-100'}`}><IconoConfiguracion nombre={icono} /><span>{nombre}</span></NavLink>)}
  </nav>;
}

export function IconoConfiguracion({ nombre, className = 'h-6 w-6 shrink-0' }: { nombre: string; className?: string }) {
  const nombres: Record<string, NombreIconoBiblioteca> = {identidad:'edificio',pagos:'tarjeta',tarifas:'boleto',ojo:'ojo',colores:'colores',telefono:'telefono',redes:'redes',guardar:'guardar',subir:'subir',personas:'personas',bus:'bus',lupa:'lupa',info:'info',ajustes:'configuracion'};
  return <IconoBiblioteca nombre={nombres[nombre]??'configuracion'} className={className}/>;
}
