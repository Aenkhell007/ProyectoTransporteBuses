# Frontend · Gran Continental

React + TypeScript + Vite, React Router y Tailwind CSS. La entrada muestra páginas en blanco con el encabezado/pie compartidos y un texto que identifica su contenido pendiente. No implementa las vistas de pago ni reemplaza el diseño aprobado de la Vista 1.

## Ejecutar

Requiere Node >=22.12 (se probó con Node24). Desde `frontend`:

```powershell
npm ci
npm run dev
```

Abre http://127.0.0.1:5173. Para parar: Ctrl+C en esa terminal. Las dependencias del backend se instalan por separado en `backend/conexion-bd`; no se ejecuta el frontend desde esa carpeta.

## Verificar

```powershell
npm ls --depth=0
npm run check
npm run build
```

La compilación genera `dist/`, que no se sube al repositorio. `npm run preview` sirve esa compilación en http://127.0.0.1:4173.

Los enlaces del encabezado muestran un texto temporal: inicio, rutas, servicios, sobre nosotros, contacto, iniciar sesión o registro. Rutas/Servicios/Sobre nosotros/Contacto conservan las direcciones de secciones del inicio. No hay formularios operativos. La ruta /vista-previa/panel muestra únicamente un texto temporal y el pie. Las dos pantallas de oficina preexistentes se conservan sin cambios y no se añaden al router de esta prueba.

## Compartir con el equipo

Subir `package.json`, `package-lock.json`, configuraciones, `index.html`, `src/` y los recursos de `public/`. No subir `node_modules/`, `.env`, `dist/`, certificados locales ni clientes generados. Los compañeros ejecutan `npm ci` al descargar la rama; así usan el lockfile y no copian node_modules.

En `src/components/layout/README.md` están las instrucciones de los componentes. App.tsx monta un único PublicLayout para las rutas públicas; las futuras páginas contienen solo su contenido (sin volver a montar otro layout). Los paneles usan SiteFooter con su navegación propia.

La conexión Supabase y sus credenciales son exclusivas del backend. Este frontend no necesita la contraseña de PostgreSQL ni una clave service_role. Las llamadas reales a la API se incorporarán al desarrollar el módulo.

Al desplegar la SPA, configurar el alojamiento para devolver index.html en rutas de cliente (BrowserRouter). Las rutas actuales suponen despliegue en la raíz del dominio.

Referencias: https://vite.dev/guide/ · https://tailwindcss.com/docs/installation/using-vite · https://reactrouter.com/start/declarative/installation
