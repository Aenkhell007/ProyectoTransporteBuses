# Encabezado y pie compartidos

Componentes React/TypeScript con CSS propio, sin dependencias adicionales ni conexión a base de datos. Importarlos desde `src/components/layout` y no copiar su código a cada pantalla. El encabezado toma el área del logo de la captura aprobada mediante CSS, sin editar la imagen original `public/images/gran-continental-encabezado-referencia.png`. Se conservan sus proporciones en escritorio y móvil. Un `logoSrc` personalizado permite usar un recurso independiente cuando esté disponible.

## Área pública y cliente

```tsx
import { PublicLayout } from '../../components/layout';

export function MetodoPago() {
  return (
    <PublicLayout>
      <section><h1>Método de pago</h1>{/* Tu contenido */}</section>
    </PublicLayout>
  );
}
```

El layout crea `main`, encabezado fijo al desplazarse y pie al final del documento; no se superpone al contenido. Usarlo UNA sola vez en el layout padre del router o, mientras no exista, en cada página. No anidar layouts ni otro `main`.

## Navegación del inicio

Los enlaces apuntan a `/`, `/#rutas`, `/#servicios`, `/#sobre-nosotros` y `/#contacto`. El inicio debe dar esos `id` a sus secciones. No son páginas independientes. El menú móvil se abre mediante botón y se cierra al elegir un enlace o pulsar Escape.

```tsx
<PublicLayout header={{ activeItem: 'inicio' }}>
  <section id="rutas">...</section>
  <section id="servicios">...</section>
  <section id="sobre-nosotros">...</section>
  <section id="contacto">...</section>
</PublicLayout>
```

Las rutas `/iniciar-sesion` y `/registrarse` son valores configurables; el equipo debe ajustarlas a su router. El componente no crea esas páginas ni detecta la sesión automáticamente. Para un cliente autenticado:

```tsx
<PublicLayout header={{ account: { label: 'Mi cuenta', href: '/perfil' } }}>
  {/* Página del cliente */}
</PublicLayout>
```

## Administración, cooperativa y oficina

Conservar su navegación propia e importar SOLO `SiteFooter` en su layout compartido. No agregar el menú público a esos paneles. El pie contiene únicamente el aviso de derechos; no afirma un registro de marca mediante ®.

```tsx
import { SiteFooter } from '../../components/layout';

export function PanelLayout() {
  return <div className="panel-layout">
    {/* Menú propio y contenido del panel */}
    <SiteFooter />
  </div>;
}
```

## Integración y estado

El frontend ya incluye package.json, entrada React, router y una página de prueba del layout. Ejecutar npm ci y npm run dev desde frontend. App.tsx monta el layout una sola vez: las futuras vistas aportan únicamente su contenido. Las pantallas de oficina existentes se conservan sin modificar. El CSS compartido usa prefijos gc-; los estilos base de la aplicación están en src/styles/index.css.

La aplicación debe servirse desde la raíz `/`. Para despliegues en subcarpetas, pasa `logoSrc`, `homeHref`, `links`, `loginHref` y `registerHref` con el prefijo correcto. La sección activa se recibe mediante `activeItem`; no hay detección automática del scroll.

## Coordinación con compañeros

Cada integrante importa estos componentes desde el mismo archivo `index.ts`. Para compartirlos, revisar los cambios, hacer un commit y abrir el PR de la rama del encabezado/pie hacia develop según el acuerdo del equipo. No se ha realizado commit, push ni merge automáticamente.
