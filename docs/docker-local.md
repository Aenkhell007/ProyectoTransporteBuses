# Ejecutar Gran Continental con Docker Compose

Compose levanta la interfaz y la API en contenedores sin privilegios. Nginx publica la interfaz en localhost y redirige /api a la API dentro de la red de Compose. La base PostgreSQL sigue siendo externa y las migraciones se gestionan por separado.

## Preparar y arrancar

En PowerShell, desde la raíz del repositorio:

    Copy-Item .env.docker.example .env.docker
    New-Item -ItemType Directory -Force backend/conexion-bd/certs | Out-Null

Configura DATABASE_URL en .env.docker con el rol runtime de tu base de pruebas o de Supabase. Si necesitas un certificado CA, colócalo en backend/conexion-bd/certs y configura su ruta dentro del contenedor, por ejemplo /app/backend/conexion-bd/certs/supabase-ca.crt. Los certificados y las credenciales opcionales se montan en solo lectura.

    docker compose config --quiet
    docker compose up -d --build
    docker compose ps
    Invoke-RestMethod http://127.0.0.1:5173/api/health

El puerto predeterminado es 5173. Si está ocupado, configura DOCKER_FRONTEND_PORT en la terminal y usa el mismo puerto en FRONTEND_URL y en las URLs de retorno que tengas activas. Para un despliegue detrás de HTTPS, configura DOCKER_COOKIE_SECURE=true y FRONTEND_URL con el origen HTTPS del navegador.

## Datos y actualización

Compose guarda los archivos nuevos en el volumen datos_pagos. Si ya tienes comprobantes o boletos generados en otra instalación, conserva su copia y usa un almacén y un BACKEND_ID coherentes con el entorno.

    docker compose logs --tail 50 backend frontend
    docker compose down
    docker compose up -d --build

El comando down conserva el volumen. Para el arranque habitual, usa siempre el mismo nombre de proyecto de Compose.
