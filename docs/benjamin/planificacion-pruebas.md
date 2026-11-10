# Evidencia de pruebas — reglas iniciales de hoja de ruta

**Responsable:** 99benjaminb · **Vista:** 18 · **Datos:** completamente ficticios.

## Cómo reproducir

Desde la raíz del repositorio, con Node.js 22.16+ (recomendado 24 LTS):

```bash
node --experimental-strip-types --test frontend/tests/planificacion.test.mjs
npm --prefix frontend run build
```

El primer comando ejecuta pruebas unitarias de la lógica pura. El segundo comprueba TypeScript y genera una compilación Vite del frontend completo; requiere las dependencias instaladas en `frontend` (`npm --prefix frontend ci`). El indicador `--experimental-strip-types` es necesario en algunas versiones de Node 22 y puede mostrar una advertencia sin representar un fallo.

## Casos automatizados

| Caso | Resultado esperado |
| --- | --- |
| Fecha imposible, falta de zona o fin no posterior al inicio | `HORARIO_INVALIDO` o instante inválido |
| Borrador sin plano ni tarifa | Se permite como borrador; **no autoriza publicación** |
| Verificación previa a publicar sin plano ni tarifa | `SIN_PLANO` y `SIN_TARIFA` |
| Frecuencia inactiva, cooperativa/grupo incompatibles o día de descanso | Errores explícitos de validación |
| Dos asignaciones del mismo bus con solape o margen insuficiente | `SOLAPAMIENTO` y IDs en conflicto |
| Otro bus o asignación cancelada | No se consideran conflicto de ese bus |
| Propuesta con primer bus ocupado y segundo libre | Selecciona el segundo como `BORRADOR` |
| Todos los buses ocupados | Devuelve `null`, sin publicar |

## Alcance de la evidencia

En una verificación aislada de estos archivos con Node.js 22.16.0, las cinco pruebas automatizadas se completaron correctamente y `tsc --noEmit --strict` no reportó errores para el módulo. Esta evidencia **no sustituye** el build global, una revisión por pares ni pruebas de API/BD; los resultados del repositorio completo deben ejecutarse y adjuntarse a la PR después de incorporar el cambio.

## Pendiente con el equipo

Validar semántica de margen operativo, días de descanso, versiones, permisos por cooperativa y estados de publicación. Cuando Matías y Mikel acuerden contratos reales, adaptar los DTO sin crear modelos Prisma duplicados. Para publicación, exigir transacción/idempotencia desde backend y probar concurrencia.
