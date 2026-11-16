import {IconoBiblioteca} from '../../components/ui/IconoBiblioteca';
export type Simbolo = 'usuario'|'grupo'|'escudo'|'edificio'|'corona'|'oficina'|'volante'|'boleto'|'calendario'|'documento'|'ruta'|'guardar'|'editar'|'enviar'|'mas'|'camara'|'correo'|'check'|'info'|'bloqueo'|'buscar'|'volver'|'whatsapp';
export function I({nombre, clase = 'size-5'}: {nombre: Simbolo; clase?: string}) {
  return <IconoBiblioteca nombre={nombre==='check'?'checkCirculo':nombre} className={clase}/>;
}
export function LogoCooperativa({nombre}: {nombre: string}) {
  return nombre.trim().toLocaleLowerCase('es') === 'gran continental'
    ? <img src="/images/Logo%20G-C.png" alt="Gran Continental" className="h-20 w-44 max-w-full object-contain"/>
    : <span className="flex h-20 w-28 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><I nombre="edificio" clase="size-10"/></span>;
}
export function Avatar(){return <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-blue-100 text-blue-800"><I nombre="usuario" clase="size-7"/></span>}
export function iconoRol(codigo:string):Simbolo{return codigo==='ADMIN_SISTEMA'?'corona':codigo==='COOPERATIVA'?'grupo':codigo==='OFICINISTA'?'oficina':codigo==='PERSONAL_BUS'?'volante':'usuario'}
export function colorRol(codigo:string){return codigo==='ADMIN_SISTEMA'?'bg-amber-50 text-amber-500':codigo==='COOPERATIVA'?'bg-green-50 text-green-700':codigo==='OFICINISTA'?'bg-violet-50 text-violet-700':codigo==='PERSONAL_BUS'?'bg-orange-50 text-orange-500':'bg-blue-50 text-blue-600'}
