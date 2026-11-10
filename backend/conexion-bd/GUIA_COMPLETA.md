# PostgreSQL en Supabase - base de transporte v1.0.0

La base seleccionada es **PostgreSQL alojada en Supabase**. El acceso de la aplicación será **React → API Node/Express/TypeScript → Prisma → PostgreSQL**. Se mantiene el motor y la arquitectura del maestro V3. No se adopta automáticamente Supabase Auth, Storage o Realtime.

Este paquete contiene el esquema físico y operaciones SQL de los módulos de las43 referencias aprobadas. La instalación no crea una aplicación web completa: todavía hay que conectar los endpoints, formularios y servicios externos. No se ha accedido a tu proyecto Supabase porque no se proporcionaron un proyecto ni credenciales.

## 1. Qué archivo ejecutar

- **INSTALAR_TODO.sql**: instalador completo en una sola transacción. Incluye61 tablas, catálogos, relaciones, índices, restricciones, funciones de negocio, consultas y seguridad. Ejecutar UNA vez en una base nueva.
- **07_DEMO_OPCIONAL.sql**: datos sintéticos separados. Únicamente para desarrollo/demostración; no hay cuentas bancarias reales ni contraseñas.
- **08_PRUEBAS.sql**: 57 casos funcionales y RLS; requiere la demo y termina con ROLLBACK. Ejecutar solamente en una base aislada recién instalada con la demo, antes de crear usuarios adicionales o registrar el baseline Prisma. Usa el rol propietario/migrador; no ejecutar sobre producción.
- Los archivos01-06 y09 son las partes del instalador para revisión. Si ejecutaste INSTALAR_TODO.sql, NO vuelvas a ejecutar esas partes.
- **conexion-backend/**: ejemplo verificado de conexión,61 modelos Prisma, normalizador de introspección, cliente, contexto de sesión y bootstrap del primer administrador.
- **MATRIZ_VISTAS_BASE_DATOS.md** relaciona las43 capturas con responsable, tablas y operaciones. **DICCIONARIO_BASE_DATOS.md** y su JSON describen las columnas reales.

El instalador se detiene si ya existe el esquema `transporte`. No incluye DROP DATABASE ni DROP SCHEMA; no sobrescribe datos anteriores. Para una versión futura se utiliza una migración revisada.

## 2. Crear el proyecto de Supabase

1. Accede a [Supabase](https://supabase.com/dashboard) con tu cuenta y crea el proyecto del equipo.
2. Define una contraseña de base de datos fuerte y guárdala en un gestor. Elige una región adecuada al backend; copia después los hosts exactos del panel, no los deduzcas por el nombre de la región.
3. Espera a que el proyecto esté disponible. Abre **SQL Editor → New query**.
4. Pega el contenido completo de **INSTALAR_TODO.sql** y ejecuta. Debe finalizar sin error. Las tablas están en el esquema **transporte**; selecciónalo en el editor de tablas.
5. Comprueba la instalación:

```sql
SELECT version, descripcion FROM transporte.schema_version;
SELECT count(*) AS tablas_aplicacion
FROM pg_tables
WHERE schemaname='transporte' AND tablename<>'_prisma_migrations';
-- Esperado: versión1.0.0 y61 tablas propias.
```

Usa un proyecto de integración del equipo y bases locales separadas para desarrollar migraciones. Que los seis integrantes compartan PostgreSQL no significa que deban ejecutar el instalador seis veces sobre la misma base.

## 3. Crear la credencial restringida del backend

El instalador crea `transporte_runtime` y `transporte_app`, inicialmente **NOLOGIN**. No deja una contraseña predeterminada en los archivos. Como propietario, habilita una contraseña propia en SQL Editor:

```sql
ALTER ROLE transporte_app LOGIN PASSWORD 'REEMPLAZAR_CON_UNA_CLAVE_FUERTE_UNICA';
```

No guardes ni compartas esa consulta con la contraseña real. `transporte_app` no es propietario de las tablas, no tiene BYPASSRLS ni permisos de creación. La cuenta propietaria/migradora se reserva para instalación, migraciones y bootstrap controlado, no para ejecutar las peticiones normales de la API.

El esquema `transporte` no debe añadirse a los esquemas expuestos de la **Data API**. Si el proyecto solo usa Prisma, puedes desactivar la Data API según la guía oficial. No se conectará directamente con `supabase-js` desde React; las políticas de este paquete usan sesiones del backend, no `auth.uid()` de Supabase Auth.

## 4. Copiar la conexión correcta

En Supabase pulsa **Connect** y elige **Session pooler**, puerto **5432**, para desarrollo local y un backend persistente en redes IPv4. La conexión directa es otra opción si tu entorno tiene conectividad IPv6 o el complemento correspondiente. No uses el puerto6543 de Transaction pooler como cadena predeterminada de migraciones.

Para runtime, el usuario del pooler es `transporte_app.PROJECT_REF`; para el propietario, habitualmente `postgres.PROJECT_REF`. Copia el host exacto mostrado por Connect. Las contraseñas con caracteres especiales deben codificarse como parte de una URL; por ejemplo `@` pasa a `%40`.

```dotenv
DATABASE_URL="postgresql://transporte_app.PROJECT_REF:CLAVE_URL_ENCODED@HOST_REAL_DEL_POOLER:5432/postgres"
DIRECT_URL="postgresql://postgres.PROJECT_REF:CLAVE_MIGRADOR_URL_ENCODED@HOST_REAL_DEL_POOLER:5432/postgres?schema=transporte&sslmode=require"
DB_SSL="true"
DB_SSL_CA_FILE=""
```

`DIRECT_URL` es el nombre de la variable reservada a herramientas; en IPv4 puede contener el Session pooler admitido por la guía Prisma de Supabase. No significa que debas inventar una conexión IPv6 que tu red no soporta. Si usas conexión directa, copia esa URI con su usuario correspondiente.

Para el runtime el ejemplo habilita TLS con verificación de certificado/hostname. Si tu proyecto requiere una CA, descárgala desde las opciones SSL de tu proyecto y coloca su ruta en `DB_SSL_CA_FILE`. Para Prisma CLI configura también el parámetro `sslcert` de `DIRECT_URL` cuando sea necesario, siguiendo su documentación. No soluciones errores de certificado con `rejectUnauthorized:false`. `DB_SSL=false` solo se admite con localhost/127.0.0.1 en el ejemplo.

## 5. Preparar la conexión Node/Prisma

Puedes revisar/ejecutar primero `conexion-backend` por separado. Después integra sus archivos en el backend real con un PR de Matías y revisión de los consumidores. No lo copies dentro del frontend ni dupliques una API por integrante.

Desde PowerShell, dentro de `conexion-backend`:

```powershell
Copy-Item .env.example .env
# Edita .env localmente con las dos cadenas reales. Nunca lo subas a Git.
npm ci
npm run db:generate
npm run check
npm run db:comprobar
npx tsx src/comprobar-orm.ts
```

El paquete ya incluye `prisma/schema.prisma` con los61 modelos generados del SQL probado. Si el esquema remoto cambia, vuelve a introspectar:

```powershell
npm run db:introspect
npm run db:generate
```

El comando de introspección usa `--force` porque ese archivo es generado y luego aplica el normalizador incluido. No escribas lógica manual en el archivo generado que quieras conservar. Los rangos, restricciones de exclusión, funciones, triggers y RLS se conservan en SQL; no se pierden porque Prisma avise que no los representa todos.

Las versiones exactas probadas están fijadas en `package-lock.json`; los paquetes Prisma son de la rama7. No se usa una versión candidata de otro major. Conserva el lockfile del ejemplo al integrarlo y coordina las versiones de Node/TypeScript con el equipo.

## 6. Primer administrador real

El instalador no crea usuarios con claves conocidas. La demo tampoco crea contraseñas utilizables. Para crear al administrador real, completa en `.env` sus nombres, apellidos, documento y correo. `DIRECT_URL` debe tener permiso de bootstrap.

En PowerShell proporciona la contraseña temporalmente sin escribirla en el comando:

```powershell
$claveAdmin = Read-Host "Contraseña del administrador (mínimo12 caracteres)" -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $claveAdmin).Password
npm run admin:crear
Remove-Item Env:ADMIN_PASSWORD
```

El script usa una transacción y scrypt, no imprime claves ni URI y se detiene ante identidad/correo ya registrados. No reemplaza cuentas existentes silenciosamente. La gestión posterior usa las funciones `alta_cooperativa_responsable`, `alta_usuario_personal` y `cambiar_estado_usuario` con una sesión autorizada.

## 7. Migraciones sin recrear lo ya instalado

Si instalaste SQL Editor primero y las tablas ya existen, registra la migración inicial como aplicada:

```powershell
npm run db:baseline
```

El directorio `prisma/migrations/0_base_transporte/migration.sql` contiene el mismo SQL completo del instalador, incluidas funciones, triggers y RLS. `migrate resolve --applied` registra la base; no ejecuta ese SQL otra vez. No marques la base como aplicada si el instalador falló o si las tablas no corresponden.

Para cambios posteriores: diseñar/probar en PostgreSQL local, generar una migración con revisión y ejecutar `npm run db:deploy` en integración. No ejecutar `db push` ni aceptar `migrate reset` contra la base compartida. Revisar explícitamente cualquier propuesta de eliminación de índices parciales, checks, exclusiones, funciones o políticas que el ORM no modele.

Los índices únicos **parciales** de intentos/políticas/reembolsos no significan unicidad para toda la historia. El normalizador conserva sus relaciones1:N en Prisma; los índices continúan aplicándose en PostgreSQL y en el SQL de la migración. Esa diferencia se revisa al generar migraciones nuevas.

## 8. Cómo usa la API las sesiones y las operaciones

`src/db.ts` exporta `conSesion(tokenCookie, trabajo)`. La función calcula SHA-256 del token, abre una transacción, verifica la sesión con `abrir_contexto` y ejecuta las consultas en esa misma conexión. Al finalizar, el contexto local se elimina automáticamente. Nunca tomes `usuarioId` de un body como autorización ni uses un SET permanente en una conexión del pool.

Las contraseñas se verifican en Node con `src/password.ts`. `credencial_login` y `emitir_sesion_autenticada` son exclusivas del servicio backend: emitir sesión solo DESPUÉS de validar la contraseña. No deben exponerse como RPC público ni aceptar un ID arbitrario desde el cliente.

Ejemplo de uso dentro de un endpoint autenticado:

```typescript
const resultado = await conSesion(tokenDeCookieSegura, (tx) =>
  tx.$queryRaw`SELECT * FROM transporte.v_mis_viajes ORDER BY salida DESC`
);
```

Para reservar, cobrar, revisar, emitir o devolver, llama las funciones parametrizadas de `EJEMPLOS_OPERACIONES.md`. El rol de API no puede escribir directamente los totales de reservas ni confirmar compras usando la función interna. Las entidades administrativas autorizadas sí tienen CRUD con RLS y claves foráneas de ámbito.

RLS protege las consultas del rol restringido frente a errores de ámbito. El backend y su credencial siguen siendo una frontera de confianza: no protege contra una API comprometida que posee la contraseña del servidor. Mantén esa contraseña fuera de React, logs y repositorio.

## 9. Qué no hace una base de datos por sí sola

- No implementa los endpoints HTTP ni conecta automáticamente las43 pantallas existentes.
- No sube/analiza archivos: guarda metadatos privados. La API valida bytes, firma, MIME, tamaño y propietario ANTES de registrar `validado_servidor=true`. No recibe ese indicador del navegador.
- No produce PDFs ni una imagen QR: crea una compra y un registro único de boleto con QR ID. El servicio de documentos genera un PDF real y después marca el boleto como listo. Escanear exige autenticación del personal y elección del pasajero; no aborda a todos automáticamente.
- No verifica fondos bancarios por apariencia del archivo. La revisión humana sigue siendo obligatoria en ese método.
- No envía correo/WhatsApp ni cobra PayPhone/PayPal/tarjeta. Hay cola y referencias para integrar adaptadores; las pasarelas no disponibles no se pueden cobrar mediante estas funciones.
- No consulta resoluciones ANT ni registros de identidad. Validación completa de cédula/RUC, formato de teléfonos, contraste, límites de login/contacto, CSRF/cookies, políticas de privacidad y análisis de archivos corresponden también al backend/UI.

## 10. Decisiones iniciales y pendientes

**Importes:** centavos BIGINT; porcentaje en puntos base (3000=30%). Se redondea el impuesto de cada línea y luego se suma. Ejemplo:5600-840+0=4760; IVA0=0; total4760. Los servicios adicionales tienen su propio impuesto configurable; no se agrega15% al pasaje terrestre del ejemplo.

**Retenciones:** valores técnicos iniciales de demostración:15 minutos y máximo10 pasajeros, configurables en `config_global` (límite físico de50 por reserva). Se vence al iniciar el viaje si fuera antes. Subir comprobante NO prorroga automáticamente la plaza. Si vence en revisión, la aprobación se rechaza y el oficinista debe conciliar los fondos; no se confirma silenciosamente otra plaza. El proceso de conciliación excepcional debe definirse antes de operación real.

**Descuentos:** el instalador no activa porcentajes legales o manuales sin definir. Solo la demo configura niño30% para reproducir la captura. Tercera edad/discapacidad permanecen sin tasa e inactivos; definir condiciones y vigencia manualmente.

**Devoluciones:** la demo conserva una política BORRADOR con24h/100%,12h/50%,4h/25% y un hueco inferior a4h. No se publica así. Para publicar hay que definir todos los intervalos, condiciones y plazo de abono; solo se admite devolución de compra completa en esta versión. La compra guarda la política vigente al confirmarse. Si entonces no había política publicada, no se le aplica una nueva retroactivamente de forma automática.

La solicitud no cancela inmediatamente: la aprobación del oficinista cancela la compra, anula el boleto y libera plazas; el abono posterior cambia el estado a reembolsada. La elegibilidad y el porcentaje se capturan al solicitar antes de la salida. Solicitudes pendientes requieren atención antes del embarque; si ya hubo abordaje se exige conciliación manual. Estos detalles operativos son una decisión técnica inicial documentada que debe validar el equipo.

**Historial:** los estados de pago, documento, solicitud y abono son independientes. Un solo boleto consolidado admite1/N pasajeros. Los datos de viaje, bus, terminales y precio se conservan como snapshot de compra/cotización.

## 11. Pruebas incluidas y fuentes

Ver `RESULTADO_PRUEBAS.json`:57 casos SQL/RLS, dos conexiones reales compitiendo por una plaza y comprobación de que repetir el instalador no pisa datos. También se comprobó conexión desde Prisma y compilación TypeScript. La prueba se realizó en PostgreSQL18.6 local aislado; no acredita una ejecución en tu Supabase ni el funcionamiento completo del frontend.

Fuentes oficiales consultadas:

- [Conexiones y endpoints de Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).
- [Prisma con Supabase](https://supabase.com/docs/guides/database/prisma).
- [Configuración de Prisma7](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference).
- [Conector PostgreSQL y adaptador pg](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql).
- [Baseline de una base existente](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/baselining).
- [Rangos y exclusiones de PostgreSQL](https://www.postgresql.org/docs/current/rangetypes.html).

No hay claves de Supabase ni contraseñas reales en el paquete. React solo necesita la URL de la API cuando esta se implemente, por ejemplo `VITE_API_URL`; nunca `DATABASE_URL`, `DIRECT_URL` ni una clave privilegiada.
