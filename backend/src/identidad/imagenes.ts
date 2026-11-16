import { randomUUID,createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import sharp from 'sharp';
import { exigir,ErrorIdentidad } from './validacion';
export async function imagen(db:PoolClient,coop:string,archivo:any,_categoria:'LOGO'){
 exigir(typeof archivo?.base64==='string'&&archivo.base64.length<2800000,'Logo: usa JPG o PNG de hasta 2 MB.');
 const b=Buffer.from(archivo.base64,'base64');exigir(b.length>0&&b.length<=2097152,'Logo demasiado grande.');let contenido:Buffer;
 try{const m=await sharp(b,{limitInputPixels:16000000}).metadata();exigir(['png','jpeg'].includes(m.format??'')&&(!m.pages||m.pages===1),'Logo no válido.');contenido=await sharp(b,{limitInputPixels:16000000}).rotate().resize({width:1200,height:1200,fit:'inside',withoutEnlargement:true}).png().toBuffer();}catch{throw new ErrorIdentidad(422,'Logo no válido: usa PNG o JPG estático.');}
 const id=randomUUID();await db.query("INSERT INTO transporte.archivos(id,propietario_id,cooperativa_id,categoria,ruta_privada,mime,bytes,sha256,validado_servidor) VALUES($1,transporte.actor(),$2,'LOGO',$3,'image/png',$4,$5,true)",[id,coop,'flota-db/'+id,contenido.length,createHash('sha256').update(contenido).digest('hex')]);await db.query('INSERT INTO transporte.flota_imagen_contenidos(archivo_id,contenido) VALUES($1,$2)',[id,contenido]);return id;
}
