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
- XLSX y PPTX se extraen e indexan localmente. El descompresor limita el archivo a 20 MB, el contenido expandido a 25 MB y el número de entradas ZIP a 1.000; el indexador limita el texto a 300.000 caracteres y 160 fragmentos. Los formatos binarios antiguos XLS/PPT se almacenan, pero no se indexan.

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
- Se cargaron diez referencias normativas nacionales iniciales (Constitución, códigos, leyes y reglamentación) y cuatro puntos de acceso oficiales: SAIJ, Base SAIJ de Normativa Provincial, directorio oficial de Justicia.ar de sentencias provinciales/CABA y Base de Datos Legislativos Infoleg (normativa nacional en datos abiertos). Las bases de datos abiertas publican sus propios cortes y frecuencia; JurisFlow debe registrar la fecha declarada en cada lote, no inferirla de la fecha de descarga. Los catálogos son enlaces de consulta; no equivalen a importar automáticamente todos los textos ni a verificar la vigencia individual de cada norma.
- Si se modifica título, cita, autoridad o URL de una fuente verificada, vuelve automáticamente a pendiente.
- Se agregaron enlaces institucionales dentro de la biblioteca: Infoleg nacional, Base SAIJ provincial, SAIJ, Secretaría de Jurisprudencia de la CSJN, CIJ y directorio oficial de sentencias por jurisdicción (23 provincias y CABA).
- Se documentó la cobertura y los límites de las fuentes de jurisprudencia: no se identificó un dataset abierto único de fallos nacionales y provinciales para importación masiva; los portales se usan como fuentes de consulta y cada fallo debe enlazarse a su publicación judicial oficial.
- Se desarrollaron importadores de solo lectura para el CSV completo de SAIJ provincial y el ZIP completo de Infoleg nacional. Conservan archivos originales, hash SHA-256, campos de origen, informe de calidad y JSONL normalizado; dejan la verificación manual pendiente. No escriben en Supabase. La ejecución real con los archivos completos sigue pendiente.

### Auditoría
- Historial por estudio para altas, modificaciones y bajas de estudios, integrantes, invitaciones, clientes, expedientes, asignaciones, documentos, agenda, vencimientos, honorarios, pagos y fuentes jurídicas.
- El registro contiene usuario, fecha, tipo de acción, tabla, identificador del elemento y nombres de campos modificados; no guarda valores anteriores/nuevos, DNI, notas, importes, contenido documental ni mensajes.
- Acceso de lectura exclusivo para owner/admin mediante RLS. No hay permisos de escritura directa desde el cliente.
- La prueba `supabase/tests/audit_trail.sql` verifica el registro de acciones, la ausencia de contenido y la restricción para el rol assistant.

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
4. Prueba funcional de OCR y extracción XLSX/PPTX con archivos ficticios en navegador/dispositivo real.
5. Ejecutar los importadores SAIJ e Infoleg con los archivos completos oficiales, revisar sus informes de calidad y diseñar una carga idempotente/reversible. Los CSV/ZIP completos todavía no se importaron. Para jurisprudencia, evaluar por jurisdicción si existe API o descarga autorizada; no hacer scraping indiscriminado ni presentar enlaces como corpus completo.
6. Controles adicionales de exportación, retención y revisión periódica del historial de auditoría.
7. Revisión jurídica de privacidad, secreto profesional, condiciones de uso y tratamiento de datos.
8. Pruebas integrales de interfaz y accesibilidad móvil.
9. Build final y despliegue en hosting. Ambos workflows de GitHub Actions pasaron npm test y npm run build en el commit 522531e6ec7d376e22194c9598f6db91f0905c6c. El HEAD actual d66f9d0af8db538f2c5bed5bfc670e8a15667208 tiene verificaciones en curso; no declarar el último cambio aprobado hasta que terminen. Todavía no se publicó la aplicación.

## Reproducibilidad de la base de datos

Las migraciones nuevas aplicadas durante esta etapa están versionadas en supabase/migrations; las tres migraciones más recientes (Infoleg y auditoría) tienen nombres de archivo alineados con las versiones registradas en Supabase. Las migraciones de bootstrap anteriores (desde 20261105023321 hasta 20261105212433) aparecen en el historial del proyecto Supabase, pero sus archivos SQL originales no están en este repositorio. No se debe intentar recrear una base vacía usando solo los archivos actuales hasta recuperar o reconstruir y revisar ese baseline.

## Restricción

No cargar expedientes reales, DNI, datos de clientes ni documentación confidencial hasta completar las pruebas funcionales y de aislamiento, revisar backups/recuperación y realizar la revisión jurídica. La ausencia de alertas del Security Advisor no es una certificación de seguridad ni sustituye pruebas con cuentas reales.
