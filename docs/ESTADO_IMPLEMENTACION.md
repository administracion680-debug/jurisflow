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
- PDF y DOCX se extraen localmente en el navegador y se indexan en fragmentos privados para búsqueda en español.
- PDF escaneados e imágenes JPG/PNG admiten OCR local en el navegador con Tesseract.js en español; el contenido no se envía a un proveedor externo. OCR limitado a 40 páginas escaneadas por PDF para evitar procesos excesivos.
- XLS/XLSX/PPT/PPTX se almacenan pero aún no se indexan.

### Agenda
- Alta y consulta de eventos, audiencias, reuniones y vencimientos.
- Vencimientos pendientes, completados y cancelados.
- Asociación opcional con expediente; la RLS aplica los permisos de la causa.

### Equipo
- Lista de integrantes con nombre y rol; el directorio no expone teléfonos ni correos de otros miembros.
- Cambio de roles, baja de integrantes, creación y revocación de invitaciones.
- El enlace de invitación se comparte manualmente; no se contrató ni activó un servicio de correo.

### Honorarios, biblioteca jurídica e investigación
- Búsqueda textual privada por expediente en fuentes verificadas y fragmentos indexados.
- La búsqueda usa PostgreSQL FTS en español y respeta permisos de lectura del expediente.
- Honorarios en ARS, pagos registrados por medio/fecha/referencia y saldos calculados.
- El backend restringe finanzas a owner/admin y abogados asignados a la causa.
- Biblioteca jurídica para legislación, jurisprudencia, reglamentación y doctrina.
- Verificación manual de fuente con autoridad, cita, URL HTTPS, fecha y usuario que revisó.
- Se cargaron diez referencias normativas nacionales iniciales (Constitución, códigos, leyes y reglamentación) y tres portales oficiales de investigación: SAIJ, Base SAIJ de Normativa Provincial e Infoleg (directorio de portales provinciales y CABA). Los tres portales están marcados como recursos oficiales; sus enlaces no equivalen a importar automáticamente todos los textos ni a verificar la vigencia de cada norma.
- Si se modifica título, cita, autoridad o URL de una fuente verificada, vuelve automáticamente a pendiente.

## Seguridad de base implementada

- RLS habilitado en todas las tablas operativas revisadas.
- Acceso por expediente para causas, documentos, fragmentos indexados, conversaciones IA, citas, agenda y vencimientos.
- Las funciones auxiliares del esquema private tienen ejecución revocada por defecto; solo se conceden las funciones necesarias a authenticated.
- Acceso financiero limitado a owner/admin y abogados asignados.
- Rol read_only limitado a lectura.
- Triggers que impiden mover registros de un estudio a otro.
- Bucket de documentos privado.
- Migraciones versionadas bajo supabase/migrations.
- Prueba SQL de aislamiento entre dos estudios ficticios ejecutada correctamente; los datos de prueba se revirtieron.
- Security Advisor y Health Advisor sin alertas en la última revisión.

## Política vigente de IA

La decisión del proyecto es mantener desactivado cualquier proveedor externo de IA. No se envían expedientes, documentos, mensajes ni datos de clientes a servicios externos. La base de conversaciones y citas está preparada, pero no hay modelo generativo ni claves configuradas. Se evaluará un modelo privado/local en el futuro, sin activar costos no autorizados.

## Todavía pendiente antes de producción

1. Prueba funcional de carga/descarga de binarios por Storage API con cuentas y archivos ficticios.
2. Pruebas completas de registro, confirmación de correo, recuperación, invitaciones y redirects en navegador con sesiones independientes.
3. Revisión de backup, restauración, monitoreo y continuidad; el plan Free no ofrece backup automático.
4. Prueba funcional de OCR con documentos escaneados ficticios en navegador/dispositivo y extracción de XLS/XLSX/PPT/PPTX.
5. Ingesta y normalización de textos normativos y jurisprudencia por jurisdicción a partir de SAIJ y fuentes oficiales; revisar vigencia y reformas de cada documento.
6. Auditoría, historial de cambios y controles de exportación.
7. Revisión jurídica de privacidad, secreto profesional, condiciones de uso y tratamiento de datos.
8. Pruebas integrales de interfaz y accesibilidad móvil.
9. Build final y despliegue en hosting. Los workflows previos ejecutaron tests y build correctamente; el último commit documental debe volver a verificarse. Todavía no se publicó la aplicación.

## Reproducibilidad de la base de datos

Las migraciones nuevas aplicadas durante esta etapa están versionadas en supabase/migrations. Las migraciones de bootstrap anteriores (desde 20261105023321 hasta 20261105212433) aparecen en el historial del proyecto Supabase, pero sus archivos SQL originales no están en este repositorio. No se debe intentar recrear una base vacía usando solo los archivos actuales hasta recuperar o reconstruir y revisar ese baseline.

## Restricción

No cargar expedientes reales, DNI, datos de clientes ni documentación confidencial hasta completar las pruebas funcionales y de aislamiento, revisar backups/recuperación y realizar la revisión jurídica. La ausencia de alertas del Security Advisor no es una certificación de seguridad ni sustituye pruebas con cuentas reales.
