# Revisión visual de las vistas de Pablo

Se conserva React, TypeScript, Vite y Tailwind CSS. Los iconos son SVG del componente existente; no se añadieron librerías ni Bootstrap. Las consultas y acciones continúan usando la API real.

## Copias separadas, sin commit ni push

Cada directorio está bajo `C:/Users/Angel GM/.codex/worktrees/` y contiene `ProyectoTransporteBuses`.

| Vista | Rama | Directorio |
| --- | --- | --- |
| 11 · Administración | feature/pablo-vista-11-backend | pablo-vista-11-visual |
| 12 · Resumen | feature/pablo-vista-12-backend | pablo-vista-12-visual |
| 12.1 · Reservas | feature/pablo-vista-12-1-backend | pablo-vista-12-1-visual |
| 12.2 · Comprobantes | feature/pablo-vista-12-2-backend | pablo-vista-12-2-visual |
| 12.3 · Reembolsos | feature/pablo-vista-12-3-backend | pablo-vista-12-3-visual |
| 13 · Revisión | feature/pablo-vista-13-backend | pablo-vista-13-visual |
| 14 · Venta | codex/pablo-vista-14-visual | pablo-vista-14-visual |

La rama visual 14 parte de `feature/pablo-vista-14-backend`, que permanece abierta en la copia integrada original con los cambios anteriores del backend. No se reescribió su historial ni se eliminaron cambios previos.

Los componentes de presentación compartidos se incluyen en las copias para que cada vista pueda revisarse y compilarse por separado. Al integrar la serie, conservar una sola versión de esos componentes. Las copias visuales no sustituyen la integración pendiente de los cambios anteriores del backend.

## Presentación

- Cabecera contextual sin repetir el título dentro del contenido; logo junto al panel lateral en escritorio.
- Indicadores con colores e iconos por función, estados legibles y tablas adaptadas a tarjetas en celular.
- Navegación inferior móvil y menú lateral existente.
- Comprobantes con banco, fechas, importe, estado y reembolso separados.
- Reembolsos con filtros por porcentaje y cooperativa, detalle de importes e historial.
- Revisión del documento real y desglose de tarifas, descuentos y cargos.
- Venta con pasos, resumen de viaje, pasajeros, comprador, efectivo y cambio. La tarjeta sigue pendiente y la transferencia usa el flujo existente.

## Validación y límites

La revisión de tipos de las siete copias y la construcción de la copia integrada deben pasar antes de publicar. Los datos dependen de la sesión y de la oficina autorizada; no se incorporaron cifras ficticias al sistema.

La revisión visual automática de Chrome se interrumpió al no poder determinar la URL con suficiente seguridad. Queda pendiente comparar las siete pantallas con sesión autorizada en escritorio y celular. No se afirma igualdad exacta con las imágenes ni aceptación visual completa.

La copia integrada se sirve en `http://127.0.0.1:4192/oficina`; `/panel` corresponde a administración. Mantener las pruebas funcionales y la migración de venta documentadas en `integracion-pablo.md` antes del despliegue.
