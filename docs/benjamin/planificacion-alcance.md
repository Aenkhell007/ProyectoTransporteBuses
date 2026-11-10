# Vista 18 — Planificación operativa y hoja de ruta (alcance inicial)

**Responsable:** 99benjaminb · **Elemento de configuración:** EC-003 · **Referencia:** Documento Maestro V3 (16/10/2026), páginas 96–98.

## Objetivo de esta entrega

Preparar reglas reutilizables de cliente para evaluar borradores de asignación de buses a frecuencias. Este cambio es una base de dominio **sin conexión al backend**, no una implementación completa de la Vista 18.

## Incluido

- DTO de frecuencia, bus, asignación existente y propuesta en borrador, definidos expresamente como provisionales.
- Comprobación de horas ISO 8601 con zona horaria, duración positiva y fechas válidas.
- Verificación de frecuencia activa, bus activo, misma cooperativa, grupo habilitado y descanso del bus.
- Detección de solapes entre asignaciones no canceladas del mismo bus, incluido margen operativo configurable.
- Validación adicional de plano y tarifa al solicitar comprobación *previa* a publicación.
- Selección determinista del primer bus elegible para una **propuesta BORRADOR**, sin modificar ni persistir viajes.

## No incluido

No hay pantalla conectada, CRUD, autenticación, migraciones, integración ANT, publicación de viajes, bloqueo transaccional, reservas, conductor operativo ni lectura de disponibilidad real. Estas reglas son ayuda de interfaz: **el servidor debe repetir las validaciones, autorizar por ámbito y proteger concurrencia**.

## Coordinación pendiente

- **Matías:** IDs, relación cooperativa/usuario, Prisma, autorización y semántica de estados.
- **Mikel:** grupos habilitados, plano, calendario de descanso y disponibilidad de flota.
- **KT:** contrato de viaje publicado para búsqueda y reservas.
- **Pablo:** hoja operativa y pruebas cruzadas.

## Próxima integración propuesta

Mantener el contrato aprobado en el equipo para `GET /api/planificacion`, `POST /api/planificacion/propuestas`, `POST/PATCH /api/asignaciones` y `POST /api/planificacion/publicar`. La publicación no forma parte de este PR y nunca debe depender solamente de estas funciones del navegador.

## Criterios de revisión

1. No modificar `App.tsx`, esquema Prisma ni archivos de otros responsables.
2. Tipos compilables con la configuración TypeScript existente.
3. Pruebas que cubran fechas, ámbito, grupos, descansos, márgenes y borradores.
4. PR contra `develop`, revisión de dos compañeros según normas de GitFlow, y aclaración explícita de lo pendiente.
