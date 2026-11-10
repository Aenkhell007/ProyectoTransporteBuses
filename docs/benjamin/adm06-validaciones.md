# ADM06 - Paradas y tarifas por tramo

Responsable: 99benjaminb

## Funcionalidades implementadas

- Listado de paradas por secuencia autorizada.
- Visualizacion de permisos de embarque y desembarque.
- Filtrado de tarifas vigentes.
- Validacion de origen, destino y frecuencia.
- Validacion del orden de paradas.
- Rechazo de precios invalidos.
- Mensajes para colecciones vacias.
- Contador de tarifas validas.

## Verificacion

Desde la raiz del repositorio:

```bash
npm --prefix frontend run build
node --experimental-strip-types --test frontend/tests/paradasTarifas.test.mjs
node --experimental-strip-types --test frontend/tests/validacionTarifas.test.mjs
```

## Vista previa

/vista-previa/paradas-tarifas

## Alcance y limitaciones

La vista utiliza datos simulados.
No escribe informacion en PostgreSQL.
La integracion con el backend requiere validacion del equipo.

## Flujo Git

Los cambios se desarrollan en una rama feature
derivada de develop y se proponen mediante
Pull Request, con revision antes de integrar.
