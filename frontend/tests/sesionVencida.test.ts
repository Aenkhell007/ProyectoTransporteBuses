import test from 'node:test';
import assert from 'node:assert/strict';
import {avisarSesionVencida} from '../src/features/auth/sesionVencida';
test('solo una respuesta 401 invalida la sesión; 403 conserva la cuenta',()=>{
 let eventos=0;const anterior=Object.getOwnPropertyDescriptor(globalThis,'window');
 Object.defineProperty(globalThis,'window',{value:{dispatchEvent:(e:Event)=>{assert.equal(e.type,'transporte:sesion-vencida');eventos++;}},configurable:true});
 try{avisarSesionVencida(403);avisarSesionVencida(500);assert.equal(eventos,0);avisarSesionVencida(401);assert.equal(eventos,1);}finally{if(anterior)Object.defineProperty(globalThis,'window',anterior);else Reflect.deleteProperty(globalThis,'window');}
});
