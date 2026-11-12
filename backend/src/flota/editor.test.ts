import test from 'node:test';
import assert from 'node:assert/strict';
import { validarBus, validarGlobal, validarIdentidad } from './validacionEditor';
const celda = {piso:1,fila:1,columna:1,tipo:'ASIENTO',codigo:'1A',clase_id:'clase'};
const bus = {unidad:'018',placa:'ABC-1234',chasis:'Scania',carroceria:'Marcopolo',grupoId:'grupo',propietario:'',correo:'',activo:true,pisos:1,filas:1,servicios:[],fotos:[],celdas:[celda]};
test('bus: valida el plano completo y rechaza coordenadas/códigos duplicados',()=>{
  assert.doesNotThrow(()=>validarBus(bus));
  assert.throws(()=>validarBus({...bus,celdas:[celda,celda]}));
  assert.throws(()=>validarBus({...bus,celdas:[celda,{...celda,columna:2}]}));
  assert.throws(()=>validarBus({...bus,celdas:[{...celda,piso:2}]}));
  assert.throws(()=>validarBus({...bus,servicios:['a','a']}));
});
test('bus: no admite payload incompleto ni placa o correo inválido',()=>{
  for(const d of [null,{}, {...bus,placa:'abc'}, {...bus,correo:'incorrecto'}, {...bus,activo:'true'}, {...bus,celdas:[]}])assert.throws(()=>validarBus(d));
});
const global = {idioma:'es-EC',moneda:'USD',zonaHoraria:'America/Guayaquil',sesionHoras:8,mfaAdministradores:false,formatos:['JPG','PDF'],maxArchivoMB:5,correo:false,whatsapp:false};
test('global: límites válidos y proveedores ausentes no se pueden activar',()=>{
  assert.doesNotThrow(()=>validarGlobal(global));
  for(const d of [{...global,sesionHoras:25},{...global,formatos:[]},{...global,formatos:['EXE']},{...global,maxArchivoMB:6},{...global,mfaAdministradores:true},{...global,whatsapp:true}])assert.throws(()=>validarGlobal(d));
});
test('identidad: rechaza enlaces ejecutables y redes ajenas',()=>{
  const identidad={nombre:'Prueba',razonSocial:'Cooperativa de prueba',ruc:'1234567890001',email:'test@example.com',primario:'#ff0018',secundario:'#00833e',texto:'#08035b',telefono:'',whatsapp:'',lema:'',direccion:'',facebook:'https://facebook.com/prueba',instagram:''};
  assert.doesNotThrow(()=>validarIdentidad(identidad));
  assert.throws(()=>validarIdentidad({...identidad,facebook:'javascript:alert(1)'}));
  assert.throws(()=>validarIdentidad({...identidad,facebook:'https://facebook.com.ejemplo.com'}));
  assert.throws(()=>validarIdentidad({...identidad,primario:'red'}));
});
