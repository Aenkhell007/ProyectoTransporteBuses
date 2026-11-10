# Layout compartido de cooperativa

`frontend/src/layouts/CooperativaLayout.tsx` es el punto de entrada para las vistas de cooperativa.
Reutiliza la estructura de los paneles existentes mediante `AdminLayout` con la variante
`cooperativa`: cabecera fija, menú lateral, sesión y pie. No duplica autenticación ni crea
una cabecera por pantalla. Admite contenido como `children` o rutas hijas mediante `Outlet`.

Ejemplo de montaje con React Router:

```tsx
<Route path="/vista-previa/cooperativa" element={<CooperativaLayout />}>
  <Route path="buses/ejecutivo" element={<VistaMikel seccion="buses" />} />
  <Route path="buses/normal" element={<VistaMikel seccion="bus-normal" />} />
  <Route path="frecuencias/grupos" element={<VistaMikel seccion="grupos" />} />
  <Route path="configuracion" element={<VistaMikel seccion="identidad" />} />
</Route>
```

Las pantallas interiores no deben volver a incluir `PublicLayout`, cabecera, lateral ni pie.
La selección del menú se obtiene de la ruta. En móvil se conserva el botón de menú del
layout compartido, con cierre mediante Escape y restauración del foco.

La vista 17.1 se monta bajo Frecuencias para mantener esa sección activa, como en la referencia.
La 11.4 permanece en Administración; las 3.1 y 3.2 permanecen en el flujo del cliente.
El panel del oficinista conserva sus rutas y contenidos.

Estas rutas solo se registran en desarrollo. Son vistas previas con ejemplos identificados:
el montaje en el panel no acredita permisos ni guardado en base de datos. Antes de exponer
rutas de producción, la integración debe aplicar el contexto de cooperativa y las
autorizaciones existentes en el servidor. No se agregan llamadas nuevas al backend.

Navegación de prueba en una sola pestaña:
- Resumen muestra explícitamente que falta implementar su contenido.
- Buses abre el editor Ejecutivo, con enlace al editor Normal.
- Frecuencias abre la vista 17.1; su pestaña Frecuencias permite seleccionar otro ejemplo.
- Grupos informa que la gestión del catálogo sigue pendiente y enlaza a compatibilidades.
- Configuración abre Identidad y contacto; Pagos abre la vista existente 19.1 dentro del mismo layout.
- Agregar cuenta bancaria abre el formulario existente 19.1.1, sin cambiar de ventana.
- Tarifas y descuentos informa que falta integrar la pantalla en este panel.

Identidad y Grupos habilitados se ajustaron a las referencias con Tailwind: tarjetas con
iconos, colores compactos, vista previa, tabla de habilitación, selección resaltada y
fichas del grupo. El estado del catálogo es de consulta: habilitar una frecuencia no
modifica el grupo ni sus buses. Los ejemplos de buses y compatibilidades no son datos
reales. Guardar un borrador no equivale a publicarlo en el servidor.
