# Comité de cambios

## Integrantes

| Integrante | Área | Responsabilidad en cambios |
|---|---|---|
| Matías Mena | Identidad y administración | Usuarios, roles, sesiones, permisos y configuración global |
| Mikel Guzmán | Flota | Buses, grupos, planos, asientos, disponibilidad e identidad de cooperativa |
| Benjamín Basurto | Operación | Rutas, frecuencias, tarifas, hojas de ruta y publicación de viajes |
| Ángel Galarza | Reservas y pagos | Reservas, comprobantes, reembolsos, métodos de pago y boletos |
| Pablo Yupa | Oficina y administración | Paneles administrativos, ventas presenciales y reportes |
| Kevin Balseca (KT) | Compra del cliente | Inicio, búsqueda, pasajeros, Mis viajes y experiencia del pasajero |

## Criterio de aprobación

Todo cambio que afecte una sola área debe ser revisado por el responsable de esa área. Todo cambio que modifique contratos de API, tablas compartidas, permisos, estados de negocio o datos usados por otra área requiere además la aprobación de al menos un responsable del área dependiente.

Los cambios de base de datos deben incluir migración no destructiva, contrato actualizado y referencia al issue o pull request. No se deben subir credenciales, datos personales reales ni cambios directos sobre la base compartida sin respaldo y revisión.

## Flujo

1. El responsable registra el cambio en un issue o pull request.
2. El responsable actualiza el contrato o documentación afectada.
3. El área dueña revisa la implementación y sus permisos.
4. Las áreas dependientes verifican que no se rompan sus endpoints o pantallas.
5. El cambio se integra a `develop` después de pasar las comprobaciones del módulo.
6. Los cambios de versión o publicación se acuerdan antes de llevarlos a `main`.

## Estado inicial

Este archivo formaliza la composición propuesta a partir de la tabla de módulos y responsables de `README.md`. Si el equipo acuerda nombres distintos o agrega un coordinador docente, debe actualizarse esta tabla mediante un pull request.
