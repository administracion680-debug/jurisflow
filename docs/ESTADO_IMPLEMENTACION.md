# Estado de implementación de JurisFlow Argentina

Actualizado: 6 de noviembre de 2026.

## Ya construido

### Cuenta y estudios
- Registro, inicio y cierre de sesión mediante Supabase Auth.
- Recuperación de contraseña.
- Alta del primer estudio jurídico.
- Selector de estudio cuando una cuenta pertenece a varios.
- Invitaciones por correo con token de un solo uso: el administrador genera un enlace y lo comparte manualmente; el sistema valida que el correo de la cuenta coincida con el invitado.
- Roles owner, admin, lawyer, assistant y read_only.

### Clientes
- Listado y búsqueda conectados a PostgreSQL.
- Alta, edición, ficha, exportación CSV y eliminación limitada a owner/admin.
- Estado activo/inactivo y control de DNI/CUIT duplicado por estudio.

### Expedientes
- Alta, edición, ficha y listado.
- Ámbito judicial separado de fuero/materia, tribunal, secretaría/sala, provincia, localidad, tipo de proceso y etapa.
- Asociación opcional con un cliente.
- Asignaciones por expediente con acceso de lectura o escritura.
- El creador recibe acceso de escritura automáticamente.
- Owner/admin pueden administrar asignaciones.

### Documentos
- Subida, listado, descarga mediante URL firmada de corta duración y eliminación autorizada.
- Bucket privado; archivos organizados por estudio/expediente.
- Tipos permitidos: PDF, Word, Excel, PowerPoint, JPG y PNG; máximo actual 20 MB.

### Agenda
- Alta y consulta de eventos, audiencias, reuniones y vencimientos.
- Vencimientos pendientes, completados y cancelados.
- Asociación opcional con expediente; la RLS aplica los permisos de la causa.

### Equipo
- Lista de integrantes y perfiles visibles dentro del estudio.
- Cambio de roles, baja de integrantes, creación y revocación de invitaciones.
- El enlace de invitación se comparte manualmente; no se contrató ni activó un servicio de correo.


### Honorarios y biblioteca jurídica
- Honorarios en ARS, pagos registrados por medio/fecha/referencia y saldos calculados.
- El backend restringe finanzas a owner/admin y abogados asignados a la causa.
- Biblioteca jurídica para legislación, jurisprudencia, reglamentación y doctrina.
- Verificación manual de fuente con autoridad, cita, URL HTTPS, fecha y usuario que revisó.
- Si se modifica título, cita, autoridad o URL de una fuente verificada, vuelve automáticamente a pendiente.

## Seguridad de base implementada

- RLS habilitado en todas las tablas operativas revisadas.
- Acceso por expediente para causas, documentos, archivos, agenda y vencimientos.
- Acceso financiero limitado a owner/admin y abogados asignados.
- Rol read_only limitado a lectura.
- Triggers que impiden mover registros de un estudio a otro.
- Bucket de documentos privado.
- Migraciones versionadas bajo supabase/migrations.

## Todavía pendiente

1. Pruebas automatizadas y manuales con dos estudios y usuarios separados para confirmar aislamiento de extremo a extremo.
2. Pruebas completas de registro, confirmación de correo, recuperación, invitaciones y redirects en el dominio final.
3. Revisión de backup, restauración, monitoreo y continuidad; el plan Free no ofrece backup automático.
4. Módulo de honorarios/pagos en interfaz.
5. Biblioteca de legislación/jurisprudencia con ingestión y validación de fuentes oficiales.
6. Asistente IA por expediente, con trazabilidad de documentos y citas verificables. No se conectó ningún proveedor de IA ni se activó ninguna API paga.
7. Auditoría, historial de cambios y controles de exportación.
8. Revisión jurídica/contractual de privacidad y transferencias internacionales de datos.
9. Build de producción y despliegue verificados en un entorno de hosting.

## Restricción

No cargar expedientes reales, DNI, datos de clientes ni documentación confidencial hasta completar las pruebas de aislamiento y revisar backups/recuperación. La ausencia de alertas del Security Advisor no es una certificación de seguridad ni sustituye pruebas con cuentas reales.
