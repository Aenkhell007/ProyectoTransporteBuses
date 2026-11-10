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

El esquema vigente está en `backend/conexion-bd/prisma/schema.prisma`; su historial reproducible está en `backend/conexion-bd/prisma/migrations/`. Hay doce migraciones, incluidas `20261112_venta_oficina_idempotente` y `20261114_configuracion_pagos` y `20261116_identidad_administracion` y `20261116_completar_configuracion_cooperativas`. Esta última completa únicamente la configuración ausente de las cooperativas; ya se aplicó en la base compartida. La migración de pagos conecta las vistas 19.1 y 19.1.1 y añade la persistencia de QR y cuenta predeterminada. Consulta [configuración de pagos real](configuracion-pagos-real.md).

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

Resultados del cierre: 62 pruebas unitarias del frontend y 41 del backend aprobadas. El recorrido manual por roles, ventas, comprobantes y reembolsos se describe en la guía de oficina; el ejemplo de comprobante es de solo lectura.

La auditoría de las 43 referencias está en [Auditoría de vistas](auditoria-43-vistas-2026-11-16.md). La migración `20261116_guardar_identidad_cooperativa` corrige el guardado limitado de identidad del rol cooperativa y ya está aplicada en la base compartida.

`20261116_contacto_publico` ya está aplicada y conecta únicamente los canales comerciales autorizados de Gran Continental con Contacto en el inicio.


El cierre contiene 17 migraciones versionadas. Para una base compartida ya actualizada, solo regenera Prisma (`npm --prefix backend/conexion-bd run db:generate`) y comprueba el estado; no repitas instalaciones ni borres datos. En una base nueva o pendiente, el responsable aplica las migraciones según la guía antes de arrancar la API. El nombre de la migración de aislamiento de entregas se ordenó después de su base, conservando su SQL y checksum, para que también funcione una instalación nueva.

La entrega automática de PDF por correo y la preparación de WhatsApp están explicadas en [Entrega de boletos](entrega-boletos.md). Se mantienen apagadas por defecto para que arrancar el backend no envíe mensajes de compras anteriores. Personal del bus y validación de abordaje por QR corresponden a la segunda entrega.
