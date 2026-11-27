# Integración Gratuita y Oficial con Google Wallet para Android

Gran Continental permite que los pasajeros agreguen sus boletos digitales confirmados a **Google Wallet en Android** usando la API oficial de Google Wallet (`TransitClass` y `TransitObject` de tipo `BUS`) mediante enlaces JWT firmados con `RS256` (`https://pay.google.com/gp/v/save/<jwt>`), **sin costo de licencia ni dependencias externas**.

El código QR del pase en Google Wallet contiene exactamente el mismo `qrId` UUID del boleto PDF, por lo que **RF11 (Validación de abordaje por QR)** funciona indistintamente escaneando el boleto PDF o el pase guardado en Google Wallet.

---

## Cómo funciona en modo demostración vs. modo oficial

- **Sin credenciales configuradas (`GOOGLE_WALLET_*` vacíos):** el backend responde `200 OK` con `{ disponible: false, modo: "DEMO_SIN_CREDENCIALES", vistaPrevia: ... }` y nunca falla con `500`. En el frontend el botón **Agregar a Google Wallet** explica claramente que faltan las credenciales de administrador.
- **Con credenciales configuradas:** el backend firma un JWT `RS256` oficial (`savetowallet`) con los datos reales del viaje, cooperativa, terminal, asiento, piso, pasajero y QR, devolviendo `{ disponible: true, modo: "OFICIAL", saveUrl }`.

---

## Paso a paso para obtener credenciales gratuitas en Google Wallet

> La API de Google Wallet es gratuita para desarrollo, pruebas académicas y producción (solo requiere cuenta de Google Cloud gratuita para crear la Cuenta de Servicio).

### 1. Crear el proyecto y la Cuenta de Servicio en Google Cloud

1. Ingresa a [Google Cloud Console](https://console.cloud.google.com/) e inicia sesión con tu cuenta Google.
2. Crea un proyecto nuevo (por ejemplo `gran-continental-wallet`).
3. En el menú lateral ve a **APIs y servicios → Biblioteca**, busca **Google Wallet API** y haz clic en **Habilitar**.
4. Ve a **IAM y administración → Cuentas de servicio → Crear cuenta de servicio**:
   - Nombre: `wallet-boletos`
   - Haz clic en **Crear y continuar → Listo**.
5. Abre la cuenta creada, entra en la pestaña **Claves → Agregar clave → Crear clave nueva → JSON** y descárgala de forma segura (**nunca la subas a Git**).
6. Del archivo JSON necesitarás:
   - `client_email` → `GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_WALLET_PRIVATE_KEY` (con saltos de línea escapados como `\n`).

### 2. Obtener el Issuer ID gratuito en Google Pay & Wallet Console

1. Entra a [Google Pay & Wallet Console](https://pay.google.com/business/console).
2. Selecciona **Google Wallet API** y completa el perfil de emisor de pruebas/académico (gratuita la creación en modo **Demo**).
3. Copia tu **Issuer ID** numérico (ejemplo de formato: `3388000000012345678`).
4. En **Users / Usuarios** dentro de Google Pay & Wallet Console, invita o autoriza el correo `client_email` de tu Cuenta de Servicio con rol de administrador o desarrollador.

### 3. Modo Demo vs. Publicación

- En **Demo mode** de Google Wallet Console puedes agregar tus propias cuentas Gmail de prueba (hasta ~10 dispositivos/cuentas Android para tu defensa) de forma inmediata y gratuita, sin esperar revisión comercial de Google.
- Cuando se requiera habilitar cualquier usuario Android del público, solicita **Publish access** en la consola de Google Wallet completando el perfil de negocio.

---

## Variables de entorno requeridas (`backend/.env` o `.env.docker`)

Puedes configurar las credenciales de dos formas equivalentes:

1. **Mediante archivo JSON de cuenta de servicio (recomendado):**
   Coloca tu archivo descargado en `backend/secrets/google-wallet.json` (ignorado por Git y fuera de la imagen Docker; se monta en `/run/secrets/google-wallet.json` dentro del contenedor):
   ```env
   GOOGLE_WALLET_ISSUER_ID=3388000000012345678
   GOOGLE_WALLET_PROJECT_ID=tu-proyecto-wallet
   GOOGLE_WALLET_CLIENT_EMAIL=wallet-boletos@tu-proyecto.iam.gserviceaccount.com
   # En ejecución nativa con npm (dentro de backend/.env):
   GOOGLE_APPLICATION_CREDENTIALS=./secrets/google-wallet.json
   # En Docker (.env.docker):
   # GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/google-wallet.json
   GOOGLE_WALLET_CLASS_SUFFIX=gran_continental_bus_v1
   ```
2. **Mediante variables en línea (alternativa):**
   ```env
   GOOGLE_WALLET_ISSUER_ID=3388000000012345678
   GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL=wallet-boletos@tu-proyecto.iam.gserviceaccount.com
   GOOGLE_WALLET_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_WALLET_CLASS_SUFFIX=gran_continental_bus_v1
   ```
- Opcionales: `GOOGLE_WALLET_ORIGINS` (orígenes separados por coma; si se omite usa `FRONTEND_URL`) y `GOOGLE_WALLET_LOGO_URL` (URL HTTPS pública del logo).

## Probar en un teléfono Android real

1. Configura las variables anteriores y reinicia el backend (`npm --prefix backend run dev` o `docker compose restart backend`).
2. Si tu cuenta está en **Demo mode**, asegúrate de haber agregado tu correo Gmail de prueba en **Google Wallet Console → Demo users**.
3. Inicia sesión en la web desde Android Chrome, abre **Mis viajes** o la pantalla **Confirmación de compra** de un boleto con estado `LISTO`.
4. Pulsa **Agregar a Google Wallet** → **Guardar en Google Wallet**.
5. Abre la app **Google Wallet** en Android y verifica que aparezca la tarjeta de transporte con el código QR, que luego puede validarse desde **Abordaje QR** (`/abordaje`).
