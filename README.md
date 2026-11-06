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
- **Extracción documental local:** PDF y DOCX; OCR local en español para PDF escaneados e imágenes JPG/PNG, con límite de 40 páginas OCR por PDF.
- **Agenda:** eventos, audiencias, reuniones y vencimientos vinculados a expedientes.
- **Honorarios:** importes ARS, registro de pagos y saldos, con acceso financiero por rol.
- **Biblioteca jurídica:** fuentes del estudio y verificación manual.
- **Investigación:** búsqueda privada por expediente en fuentes verificadas y fragmentos indexados.

## Seguridad

- RLS habilitado en las tablas operativas revisadas.
- Prueba SQL de aislamiento entre dos estudios ficticios ejecutada correctamente: expedientes, Storage y conversaciones IA aislados; el cliente no puede insertar respuestas assistant. Los datos de prueba se revirtieron.
- Aislamiento por estudio y asignación por expediente.
- El rol read_only no puede escribir.
- Documentos, agenda, vencimientos, conversaciones y citas heredan permisos del expediente.
- Honorarios y pagos limitados a owner/admin y abogados asignados.
- El creador de una causa recibe acceso de escritura.
- No se permite trasladar registros entre estudios.
- Bucket privado; archivos organizados por estudio/expediente.
- Clave publishable en frontend; nunca incluir service_role ni secretos.

## Asistente IA y privacidad

La base de datos está preparada para conversaciones IA por expediente, mensajes con RLS y citas trazables. La búsqueda jurídica y la extracción/OCR local permiten consultar materiales sin enviar documentos a terceros. **Por decisión de producto, no se conectará por ahora ningún proveedor externo de IA ni se enviará contenido de expedientes fuera de JurisFlow.** Un modelo privado/local se evaluará más adelante, solo si puede operar con seguridad y sin activar costos no autorizados. Los mensajes assistant/system deben generarse en un servicio de servidor, nunca desde el navegador.

La IA generativa permanece desactivada; no hay modelo conectado ni claves de proveedor configuradas.

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

No cargar expedientes reales hasta completar las pruebas funcionales de Storage, Auth/redirects, OCR y UI, recuperar/versionar el baseline de migraciones, definir y probar backup/restauración, revisar privacidad y validar el despliegue. La ausencia de alertas del Security Advisor no certifica la aplicación.
