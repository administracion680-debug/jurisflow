# JurisFlow Argentina

Plataforma de gestión jurídica para estudios y profesionales de Argentina. La prioridad es la confidencialidad, el acceso por expediente y las fuentes jurídicas verificables.

## Desarrollo local

```bash
npm install
npm run dev
```

## Compilar

```bash
npm run build
```

## Módulos conectados actualmente

- Supabase Auth: registro, inicio de sesión, recuperación de contraseña.
- Estudios: creación, selector de estudio y roles.
- Clientes: listado, búsqueda, alta, edición, ficha, exportación y eliminación según rol.
- Expedientes: alta, edición, asociación con cliente, jurisdicción, fuero, tribunal y etapa procesal.
- Documentos: carga y descarga privada por expediente, con enlaces temporales.
- Agenda: eventos, audiencias y vencimientos vinculados a expedientes.
- Equipo: roles, asignaciones e invitaciones compartibles.
- Honorarios: importes en ARS, pagos registrados y saldos, con permisos financieros por rol.
- Biblioteca jurídica: registro de legislación/jurisprudencia y verificación manual de fuentes.
- Asignación de integrantes a cada expediente.
- Documentos: almacenamiento privado, subida, listado, descarga con enlace temporal y eliminación según permisos.
- Agenda: eventos, audiencias, reuniones y vencimientos.
- Equipo: integrantes, roles e invitaciones con enlace compartible.
- Interfaz en español, adaptable a teléfono y escritorio.

## Seguridad de datos

- RLS habilitado en las tablas operativas revisadas.
- Aislamiento por estudio y asignación por expediente.
- Rol read_only solo lectura.
- Documentos y archivos privados heredan permisos del expediente.
- Honorarios y pagos limitados a owner/admin y abogados asignados.
- El creador de un expediente recibe acceso de escritura.
- No se permite trasladar registros entre estudios.
- Bucket privado con ruta de archivo firm_uuid/case_uuid/filename.

## Documentación

- [Arquitectura nacional](docs/ARQUITECTURA_NACIONAL.md)
- [Modelo de datos inicial](docs/MODELO_DATOS_INICIAL.md)
- [Usuarios, organizaciones y permisos](docs/USUARIOS_ORGANIZACIONES_PERMISOS.md)
- [Revisión técnica de Supabase](docs/REVISION_TECNICA_SUPABASE.md)
- [Pruebas de seguridad y aceptación](docs/PRUEBAS_SEGURIDAD.md)
- [Estado de implementación y pendientes](docs/ESTADO_IMPLEMENTACION.md)

## Configuración

El frontend usa la URL del proyecto Supabase y una clave publishable (pública). Se pueden sobrescribir con VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY. Nunca colocar service_role, secret keys ni contraseñas en el frontend.

Las migraciones aplicadas están versionadas en supabase/migrations. Se conserva el proyecto existente en plan Free; no se activaron servicios pagos.

## Antes de producción

No cargar información jurídica real hasta completar las pruebas de aislamiento con varias cuentas, confirmar Auth/redirects, revisar backups y restauración, y validar la seguridad del despliegue. La ausencia de alertas del Security Advisor no certifica la aplicación.
