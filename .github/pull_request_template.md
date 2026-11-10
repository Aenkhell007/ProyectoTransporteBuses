## Descripción del cambio

<!-- De 2 a 4 líneas: qué cambia y por qué. -->

## Ticket vinculado

- Closes #
- SCR: <!-- solo después de v1.0.0, si el comité asignó uno -->

## Tipo de cambio

- [ ] Estándar (bajo riesgo: texto, estilo, documentación)
- [ ] Normal (funcionalidad nueva o cambio de comportamiento; requiere comité después de v1.0.0)
- [ ] Corrección de defecto
- [ ] Tarea técnica o documentación

## Archivos

- 

## Reglas aplicadas

<!-- Validaciones y reglas de negocio, con su origen: vista N del maestro V3, función SQL, contrato de API. -->

## Pruebas

Commit revisado: 

Pruebas unitarias:
- `npm --prefix frontend run build`: 
- `npm --prefix backend run check:api`: 
- `npm --prefix backend run test:auth`:  de 15
- `npm --prefix backend run test:compra`:  de 3
- `npm --prefix backend run test:pagos`:  de 6

Prueba de integración (`test:pagos:db`): <!-- ejecutada / no aplica / requiere DIRECT_URL -->

Recorrido manual: <!-- rutas, anchos de pantalla (360, 390, 768, 1440 px) y resultado -->

## Alcance y pendientes

<!-- Lo que no entra en este PR y las dependencias con otros módulos. -->

## Verificaciones del autor

- [ ] Compila sin errores.
- [ ] No hay URL con contraseña, tokens, contenido de `.env`, cédulas ni teléfonos reales en el código, el PR ni las capturas.
- [ ] Imágenes nuevas en WebP y con menos de 500 KB.
- [ ] Los elementos de configuración afectados están actualizados en `docs/configuracion/inventario-ec.csv`.
- [ ] La rama tiene el último `develop` (`git merge origin/develop`).
