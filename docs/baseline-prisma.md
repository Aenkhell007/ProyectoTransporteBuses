# Historial de Prisma de la base compartida

## Estado al 30 de octubre de 2026

La base compartida configurada tiene registradas como aplicadas:

- `0_base_transporte`.
- `20261026_activacion_email`.

Se registraron después de comparar las definiciones SQL con Supabase y comprobar una restauración privada del respaldo. No se borraron datos ni se volvieron a ejecutar los SQL sobre la base existente. `transporte._prisma_migrations` conserva sus checksums correctos.

## Equipo que usa la misma base compartida

Desde `backend/conexion-bd`, con su `.env` privado configurado para esa base:

```sh
npx prisma migrate status
npm run db:deploy
npm run db:comprobar
```

Los dos primeros comandos deben indicar que no hay migraciones pendientes. No se debe repetir `db:baseline` ni `migrate resolve` sobre una base que ya tenga el historial correcto. No editar los archivos de migración ya aplicados: cada cambio posterior debe tener su propia migración.

## Instalación en una base nueva

Usar las migraciones con `npm run db:deploy` en una base vacía compatible. No usar `resolve` para simular que ya existen tablas. La migración inicial crea roles y la extensión `btree_gist`; necesita un usuario administrativo con los permisos correspondientes. El usuario de ejecución de Express es `transporte_app`, distinto del utilizado para migraciones. Las credenciales se configuran en privado.

## Otra base existente sin historial

No copiar el procedimiento de marcado sin auditar esa base. Primero comprobar destino, estructura, permisos y migraciones ya instaladas; crear y verificar un respaldo recuperable. Solo después se pueden registrar las migraciones que realmente coincidan. No usar `reset`, no volver a ejecutar la base inicial y no marcar cambios como aplicados sin verificarlos.

## Verificaciones realizadas

- Comparación antes y después: sin diferencias en los objetos de negocio revisados.
- Checksums del historial: coinciden con ambos archivos SQL.
- `prisma migrate status`: base al día.
- `prisma migrate deploy`: ninguna migración pendiente.
- Conexión: `transporte_app`, versión 1.0.0.
- Servidor: revisión de tipos correcta y nueve pruebas unitarias de identidad correctas.
- No se enviaron correos ni se ejecutó una compra durante esta tarea.

El respaldo contiene datos privados y se conserva fuera del repositorio; no debe adjuntarse a un PR ni subirse a Git.
