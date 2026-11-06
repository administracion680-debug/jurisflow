# JurisFlow Argentina

Plataforma nacional de gestión jurídica para estudios y profesionales. Se construye por etapas con prioridad en confidencialidad, permisos por expediente y fuentes jurídicas verificables.

## Desarrollo

```bash
npm install
npm run dev
npm run build
```

## Módulos conectados

- **Cuenta y estudios:** registro, inicio/cierre, recuperación de contraseña, creación de estudio y selector multiestudio.
- **Equipo:** roles owner/admin/lawyer/assistant/read_only, invitaciones con enlace compartible y aceptación vinculada al correo.
- **Clientes:** alta, edición, ficha, búsqueda, exportación CSV, estado y control de DNI/CUIT duplicado por estudio.
- **Expedientes:** alta, edición, asociación con cliente, jurisdicción provincial/nacional/federal/CABA, fuero, tribunal, provincia/localidad y etapa procesal.
- **Asignaciones:** permisos de lectura/escritura por expediente.
- **Documentos:** almacenamiento privado, subida, listado, descarga con enlace temporal y eliminación según permisos.
- **Agenda:** eventos, audiencias, reuniones y vencimientos vinculados a expedientes.
- **Honorarios:** importes ARS, registro de pagos y saldos, con acceso financiero por rol.
- **Biblioteca jurídica:** fuentes del estudio y verificación manual.
- **Investigación:** búsqueda privada por expediente en fuentes verificadas y fragmentos indexados.

## Seguridad

- RLS habilitado en las tablas operativas revisadas.
- Aislamiento por estudio y asignación por expediente.
- El rol read_only no puede escribir.
- Documentos, agenda, vencimientos, conversaciones y citas heredan permisos del expediente.
- Honorarios y pagos limitados a owner/admin y abogados asignados.
- El creador de una causa recibe acceso de escritura.
- No se permite trasladar registros entre estudios.
- Bucket privado; archivos organizados por estudio/expediente.
- Clave publishable en frontend; nunca incluir service_role ni secretos.

## Base del asistente IA

La base ya contiene conversaciones IA por expediente, mensajes con RLS, citas trazables y fragmentos con búsqueda textual en español. La búsqueda jurídica por expediente ya está disponible. Los PDF y DOCX pueden extraerse localmente en el navegador y sus fragmentos se guardan en la base privada; no se envían a un tercero. OCR para documentos escaneados y conexión de un modelo externo siguen pendientes de evaluación de privacidad. No se envía contenido a ningún proveedor de IA.

## Documentación

- [Arquitectura nacional](docs/ARQUITECTURA_NACIONAL.md)
- [Modelo de datos inicial](docs/MODELO_DATOS_INICIAL.md)
- [Usuarios, organizaciones y permisos](docs/USUARIOS_ORGANIZACIONES_PERMISOS.md)
- [Revisión técnica de Supabase](docs/REVISION_TECNICA_SUPABASE.md)
- [Pruebas de seguridad y aceptación](docs/PRUEBAS_SEGURIDAD.md)
- [Estado de implementación y pendientes](docs/ESTADO_IMPLEMENTACION.md)
- [Asistente IA y privacidad](docs/ASISTENTE_IA_Y_PRIVACIDAD.md)

## Configuración y límites

El frontend usa la URL del proyecto Supabase y una clave publishable pública. Se pueden sobrescribir con VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY. Las migraciones nuevas creadas en esta rama están versionadas en supabase/migrations. Las migraciones de bootstrap anteriores ya existían en el proyecto Supabase y todavía falta recuperar su SQL original; por eso no se puede reconstruir una base vacía únicamente con los archivos actuales.

Se conserva el proyecto Supabase existente en plan Free. No se activaron servicios pagos ni se usó Bolt. El plan Free no incluye backups automáticos ni garantías de continuidad productiva.

## Antes de producción

No cargar expedientes reales hasta completar las pruebas de aislamiento con varias cuentas, confirmar Auth/redirects del dominio final, revisar backup/restauración, validar el despliegue y evaluar legalmente la transferencia de datos. La ausencia de alertas del Security Advisor no certifica la aplicación.
