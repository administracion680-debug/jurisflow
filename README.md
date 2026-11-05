# JurisFlow Argentina

Plataforma de gestión jurídica para estudios y profesionales de Argentina. La aplicación se desarrolla por etapas, con prioridad en confidencialidad, permisos por expediente y uso de fuentes jurídicas verificables.

## Desarrollo local

```bash
npm install
npm run dev
```

## Compilar

```bash
npm run build
```

## Funcionalidad conectada actualmente

- Inicio de sesión, registro y recuperación de acceso con Supabase Auth.
- Creación del espacio de trabajo del estudio.
- Selección de estudio cuando el usuario pertenece a más de uno.
- Módulo Clientes conectado a PostgreSQL: listado, búsqueda, alta, edición, ficha, exportación CSV y eliminación según rol.
- Precios y servicios pagos no habilitados.
- Interfaz en español, responsive, azul oscuro, blanco y verde.

## Seguridad implementada en la base

- RLS habilitado en las tablas operativas revisadas.
- Asignaciones explícitas a expedientes mediante case_members.
- Owner/admin pueden administrar asignaciones; abogado y asistente requieren asignación para expedientes.
- Perfil read_only solo lectura.
- Documentos y archivos privados heredan permisos del expediente.
- Honorarios y pagos limitados a owner/admin y abogados asignados.
- El creador de un expediente recibe permiso de escritura.
- El bucket privado requiere rutas <firm_uuid>/<case_uuid>/<filename>.

Las migraciones aplicadas se versionan en supabase/migrations.

## Documentación

- [Arquitectura nacional](docs/ARQUITECTURA_NACIONAL.md)
- [Modelo de datos inicial](docs/MODELO_DATOS_INICIAL.md)
- [Usuarios, organizaciones y permisos](docs/USUARIOS_ORGANIZACIONES_PERMISOS.md)
- [Revisión técnica de Supabase](docs/REVISION_TECNICA_SUPABASE.md)
- [Pruebas de seguridad y aceptación](docs/PRUEBAS_SEGURIDAD.md)

## Variables públicas del cliente

La aplicación usa la URL del proyecto Supabase y una clave publishable (pública). Se pueden sobrescribir mediante VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY. Nunca colocar service_role, secret keys ni contraseñas en el frontend.

## Estado y restricciones

La interfaz ya utiliza autenticación y base de datos; no debe confundirse con una plataforma lista para producción. Antes de cargar expedientes reales faltan las pruebas de aislamiento con usuarios reales, el flujo de invitaciones probado de punta a punta, revisión de restauración/backup, ajustes de Auth y validación de documentos y almacenamiento. El plan Free no ofrece garantías de backup automático ni continuidad productiva.

No cargar información jurídica real hasta completar y aprobar las pruebas de seguridad. Los módulos Expedientes y Agenda siguen en desarrollo en la interfaz.
