# Plan de Reversión — Migración `20261130_auditoria_seguridad_pagos_wallet`

Este documento describe el procedimiento seguro de reversión de la migración `20261130_auditoria_seguridad_pagos_wallet`, preservando íntegros todos los datos reales existentes en la base de datos.

## Alcance de la migración

La migración `20261130_auditoria_seguridad_pagos_wallet` es **estrictamente aditiva e idempotente**:
- No elimina, trunca ni altera columnas o filas de datos de negocio.
- Solo actualiza definiciones de funciones PL/pgSQL/SQL, una política RLS (`registrar_archivo` en `transporte.archivos`), triggers en catálogos/permisos e índices secundarios (`IF NOT EXISTS`).

## Respaldo previo verificable

Antes de ejecutar `db:deploy` se generó respaldo completo de:
- Definiciones previas de funciones y políticas (`pg_get_functiondef`) junto con el conteo de filas base de todas las tablas principales en `pre_estado_bd.json` (directorio de respaldo de la sesión).
- Archivos privados locales de `backend/.data/pagos/`.

## Procedimiento de reversión sin pérdida de datos

Si se requiere revertir únicamente los objetos creados o modificados por `20261130_auditoria_seguridad_pagos_wallet`, ejecutar dentro de una transacción (`BEGIN; ... COMMIT;`) en PostgreSQL:

1. **Eliminar funciones nuevas incorporadas en `20261130`:**
   ```sql
   DROP FUNCTION IF EXISTS transporte.mantener_expiraciones_y_sesiones();
   DROP FUNCTION IF EXISTS transporte.imagen_publica_flota(uuid);
   DROP FUNCTION IF EXISTS transporte.logo_publico_cooperativa(uuid);
   DROP FUNCTION IF EXISTS transporte.disponibilidad_clases_viajes(uuid[], integer[], integer[]);
   DROP FUNCTION IF EXISTS transporte.consultar_boleto_abordaje(uuid);
   DROP FUNCTION IF EXISTS transporte.puede_en_reserva(text, uuid, uuid);
   ```

2. **Restaurar la firma previa de `transporte.emitir_sesion_autenticada`:**
   ```sql
   DROP FUNCTION IF EXISTS transporte.emitir_sesion_autenticada(uuid, text, timestamptz, inet, text);
   -- Restaurar definición original (3 argumentos) desde pre_estado_bd.json o migración 20261026_activacion_email.
   ```

3. **Restaurar funciones modificadas desde las definiciones guardadas en las migraciones previas (`0_base_transporte`, `20261105`, `20261125`, `20261127`, `20261129`) o `pre_estado_bd.json`:**
   - `transporte.puede`
   - `transporte.reserva_autorizada`, `transporte.reserva_visible`
   - `transporte.marcar_boleto_emitido`, `transporte.asignar_entrega_boleto`
   - `transporte.registrar_comprobante`, `transporte.expirar_reservas`
   - `transporte.registrar_paradero_local`
   - `transporte.guardar_pasajero`, `transporte.cotizar`, `transporte.aceptar_cotizacion`, `transporte.crear_intento_pago`
   - `transporte.confirmar_compra_interna`, `transporte.decidir_comprobante`, `transporte.restablecer_password`
   - `transporte.identidad_asignar_rol`, `transporte.buscar_intento_payphone`, `transporte.consultar_pago_cliente`
   - `transporte.registrar_abordaje`, `transporte.compra_viaje_datos`, `transporte.compra_buscar`, `transporte.compra_detalle`
   - `transporte.tg_auditar`

4. **Restaurar la política previa `registrar_archivo` en `transporte.archivos` (si aplica):**
   ```sql
   DROP POLICY IF EXISTS registrar_archivo ON transporte.archivos;
   CREATE POLICY registrar_archivo ON transporte.archivos
     FOR INSERT TO transporte_runtime
     WITH CHECK (
       (propietario_id = transporte.actor())
       AND ((cooperativa_id IS NULL) OR (EXISTS (SELECT 1 FROM transporte.cooperativas WHERE cooperativas.id = archivos.cooperativa_id)))
     );
   ```

5. **Eliminar triggers añadidos:**
   ```sql
   DROP TRIGGER IF EXISTS act_provincias ON transporte.provincias;
   DROP TRIGGER IF EXISTS act_marcas_bus ON transporte.marcas_bus;
   DROP TRIGGER IF EXISTS aud_usuario_permisos ON transporte.usuario_permisos;
   DROP TRIGGER IF EXISTS aud_provincias ON transporte.provincias;
   DROP TRIGGER IF EXISTS aud_marcas_bus ON transporte.marcas_bus;
   ```

6. **Eliminar índices secundarios añadidos:**
   ```sql
   DROP INDEX IF EXISTS transporte.sesiones_usuario_activas_idx;
   DROP INDEX IF EXISTS transporte.sesiones_expiracion_idx;
   DROP INDEX IF EXISTS transporte.tokens_identidad_limpieza_idx;
   DROP INDEX IF EXISTS transporte.intentos_pago_payphone_orden_idx;
   DROP INDEX IF EXISTS transporte.reserva_asientos_viaje_estado_idx;
   DROP INDEX IF EXISTS transporte.abordajes_compra_idx;
   DROP INDEX IF EXISTS transporte.bus_fotos_bus_orden_idx;
   DROP INDEX IF EXISTS transporte.boletos_estado_idx;
   DROP INDEX IF EXISTS transporte.solicitudes_reembolso_compra_created_idx;
   ```

7. **Registrar rollback en Prisma (sin reiniciar la base de datos):**
   ```powershell
   npm --prefix backend/conexion-bd run db:estado
   npx --prefix backend/conexion-bd prisma migrate resolve --rolled-back 20261130_auditoria_seguridad_pagos_wallet
   ```

> **Advertencia:** Nunca ejecutar `prisma migrate reset` ni `prisma db push --force-reset` en este proyecto porque contiene datos reales y políticas RLS propias.
