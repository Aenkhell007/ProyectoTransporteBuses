# Conexión PostgreSQL del backend

Este módulo está dentro del backend del proyecto. Conserva los archivos iniciales de `backend/src` y el esquema anterior de `backend/prisma`. El esquema PostgreSQL instalado en Supabase es la fuente de este cliente de 61 modelos; el esquema inicial de dos modelos todavía requiere integración con el equipo.

## Conectar

1. Edita `.env` aquí. Sustituye `PASSWORD_URL_ENCODED` por la contraseña de `transporte_app` y `MIGRATOR_PASSWORD_URL_ENCODED` por la del proyecto. Codifica los caracteres especiales para URL. No compartas el archivo.
2. Abre una terminal EN ESTA CARPETA y ejecuta:

```powershell
npm ci
npm run db:generate
npm run check
npm run db:comprobar
npx tsx src/comprobar-orm.ts
```

La base ya está instalada. No vuelvas a ejecutar el instalador ni uses `prisma db push`. Si necesitas registrar la migración inicial con Prisma, consulta GUIA_COMPLETA.md y utiliza `npm run db:baseline` una sola vez sobre la base instalada.

`.env` contiene inicialmente marcadores, no contraseñas reales. Está excluido por `.gitignore`. La conexión se realiza desde Node, no desde React. Este módulo comprueba la conexión y ofrece el cliente compartido; no implementa automáticamente los endpoints existentes.
