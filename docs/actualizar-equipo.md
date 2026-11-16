# Actualizar y probar la integración del equipo

## Traer los cambios

Conserva primero cualquier trabajo local pendiente en tu propia rama. Desde la raíz:

```powershell
git switch develop
git pull --ff-only origin develop
npm --prefix backend ci
npm --prefix frontend ci
npm --prefix backend/conexion-bd ci
```

Si Windows informa archivos bloqueados, detén únicamente los servidores de este proyecto y repite la instalación.

## Base de datos

El esquema vigente está en `backend/conexion-bd/prisma/schema.prisma`; su historial reproducible está en `backend/conexion-bd/prisma/migrations/`. Hay diez migraciones, incluidas `20261112_venta_oficina_idempotente` y `20261114_configuracion_pagos` y `20261116_identidad_administracion` y `20261116_completar_configuracion_cooperativas`. Esta última completa únicamente la configuración ausente de las cooperativas; ya se aplicó en la base compartida. La migración de pagos conecta las vistas 19.1 y 19.1.1 y añade la persistencia de QR y cuenta predeterminada. Consulta [configuración de pagos real](configuracion-pagos-real.md).

Git distribuye el código SQL y el esquema. Los datos compartidos permanecen en PostgreSQL/Supabase. Cada compañero debe recibir por el canal privado del equipo su configuración de conexión y CA. No se necesitan Supabase Auth ni Storage.

1. Completa las plantillas `.env.example` de backend, conexión y frontend con la configuración privada autorizada.
2. Configura `DB_SSL_CA_FILE` con la ruta de tu certificado, sin desactivar la validación TLS.
3. Usa `DATABASE_URL` con el rol de aplicación para ejecutar la API. `DIRECT_URL` se reserva al responsable de migraciones.
4. Ejecuta `npm --prefix backend/conexion-bd run db:comprobar` para comprobar la conexión de la aplicación.
5. El responsable puede ejecutar `npm --prefix backend/conexion-bd run db:estado` para verificar nombres, estados y checksums de las migraciones. Solo lee metadatos, también acepta diferencias de finales de línea entre Windows y Linux.

En la base compartida no repitas el instalador, el baseline ni migraciones SQL ya aplicadas. No ejecutes `prisma db push` para sincronizarla. Si el comprobador informa pendientes o diferencias, el responsable revisa el resultado antes de aplicar `db:deploy` con sus permisos. Una base nueva necesita además la configuración de roles, usuarios y credenciales descrita en `backend/conexion-bd/GUIA_COMPLETA.md` y `docs/baseline-prisma.md`.

La integración de las ocho vistas de Matías y su prueba transaccional están en [Identidad y administración](identidad-matias.md).

## Datos de demostración

Los scripts versionados están en `docs/oficina/datos-prueba-oficina.sql` y `politica-reembolso-solo-pruebas.sql`. Su orden, requisitos y efectos están en [probar datos de oficina](oficina/probar-datos-oficina.md). Reutilizan Gran Continental, Matriz Ambato y el oficinista que ya exista; no crean contraseñas ni cambian permisos. El responsable debe coordinar la carga en la base compartida: no hace falta que cada compañero vuelva a cargar los mismos registros.

Los comprobantes adjuntos y boletos PDF se guardan en `backend/.data` de cada equipo. No viajan por Git: que una reserva exista en PostgreSQL no hace que su archivo privado exista en otro backend. Para probar la revisión completa, crea la reserva y adjunta un documento de prueba usando el backend de tu equipo. No copies comprobantes privados al repositorio.

## Arranque y comprobación

```powershell
# Terminal 1
npm --prefix backend run dev
# Terminal 2
npm --prefix frontend run dev
```

Abre `http://127.0.0.1:5173` y comprueba `http://127.0.0.1:3000/api/health`. `FRONTEND_URL` debe corresponder al origen que uses. Cada integrante inicia sesión con su propia cuenta y membresías autorizadas.

```powershell
npm --prefix frontend run build
npm --prefix backend run check:api
npm --prefix backend/conexion-bd run check
node backend/node_modules/tsx/dist/cli.mjs --tsconfig frontend/tsconfig.json --test frontend/tests/*.test.*
npm --prefix backend test
```

Resultados de la limpieza: 56 pruebas del frontend y 28 del backend aprobadas. El recorrido manual por roles, ventas, comprobantes y reembolsos se describe en la guía de oficina; el ejemplo de comprobante es de solo lectura.
