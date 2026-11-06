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
- Se desarrollaron importadores de solo lectura para SAIJ provincial, Infoleg nacional y las dos bases complementarias de Infoleg. Conservan procedencia, hashes, filas fuente, reportes y salida normalizada; dejan la verificación jurídica pendiente y no escriben en Supabase.
- El normalizador SAIJ reconoce las 23 provincias y CABA como jurisdicción autónoma (`autonomous_city`); la prueba quedó aprobada en el CI del HEAD `398ce5f0c2028677d24c8dc7ca3f598e93a8e970`.

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
5. Ejecutar los importadores Node.js del repositorio con los archivos completos, revisar los reportes de calidad y generar artefactos reproducibles. Los cuatro recursos oficiales (SAIJ provincial, Infoleg nacional y ambos ZIP complementarios) se descargaron y validaron en el workflow integral `42261459866`; los tres importadores se ejecutaron correctamente sobre los archivos completos. No se cargaron los registros a Supabase. Para jurisprudencia, evaluar por jurisdicción si existe API o descarga autorizada; no hacer scraping indiscriminado ni presentar enlaces como corpus completo.
6. Controles adicionales de exportación, retención y revisión periódica del historial de auditoría.
7. Revisión jurídica de privacidad, secreto profesional, condiciones de uso y tratamiento de datos.
8. Pruebas integrales de interfaz y accesibilidad móvil.
9. Build final y despliegue en hosting. El CI del HEAD `398ce5f0c2028677d24c8dc7ca3f598e93a8e970` terminó en `success` (`npm ci`, auditoría, pruebas y build). Todavía no se publicó la aplicación; el despliegue queda bloqueado por pruebas funcionales de Storage/Auth, revisión de privacidad y continuidad.

## Reproducibilidad de la base de datos

Las migraciones nuevas aplicadas durante esta etapa están versionadas en supabase/migrations; las tres migraciones más recientes (Infoleg y auditoría) tienen nombres de archivo alineados con las versiones registradas en Supabase. El historial remoto completo contiene 50 migraciones; los 50 archivos SQL de la rama fueron cotejados por hash de objeto Git contra las sentencias almacenadas en Supabase y coinciden exactamente. Esto no sustituye la prueba de despliegue en una instancia limpia/staging.

## Restricción

No cargar expedientes reales, DNI, datos de clientes ni documentación confidencial hasta completar las pruebas funcionales y de aislamiento, revisar backups/recuperación y realizar la revisión jurídica. La ausencia de alertas del Security Advisor no es una certificación de seguridad ni sustituye pruebas con cuentas reales.


### Infoleg complementaria (avance)

Se agregó un importador para los ZIP completos de Normas Modificatorias y Normas Modificadas. Normaliza ambos recursos a relaciones dirigidas, compara sus conjuntos, valida que los IDs existan en la base nacional y conserva filas fuente/duplicados. La revisión de los ZIP aportados encontró 377.106 relaciones únicas coincidentes y todos los IDs resueltos en la base nacional. El importador y sus pruebas están en el branch de trabajo; la ejecución completa del workflow v3 terminó correctamente. La integración/carga en Supabase sigue pendiente y no se cargaron datos.


## Validación independiente de los ZIP Infoleg recibidos

El 6 de noviembre de 2026 se comprobaron los tres ZIP adjuntos con herramientas de lectura ZIP/CSV: 430.834 filas nacionales (426.144 IDs únicos y 4.690 filas con ID repetido), 380.481 filas de normas modificatorias (377.106 relaciones únicas y 3.375 filas repetidas) y 385.118 filas de normas modificadas (377.106 relaciones únicas y 8.012 filas repetidas). Ambos recursos complementarios representan exactamente el mismo conjunto de relaciones y todos los IDs de ambos extremos existen en el catálogo nacional. Se registraron hashes SHA-256 en `docs/VALIDACION_ZIP_INFOLEG_2026-11-06.md`. La ejecución integral posterior de los importadores Node.js se completó en el workflow `42261459866`; esto no equivale a una revisión jurídica individual de vigencia.


## Revisión adicional de Supabase (6 de noviembre de 2026)

- Proyecto `JurisFlow`: estado `ACTIVE_HEALTHY`, región `us-west-2` (Estados Unidos).
- Tamaño de la base consultado con `pg_database_size`: 13.522.611 bytes (aprox. 13 MB) al momento de la revisión.
- `public.legal_library` tiene RLS habilitado y 14 filas. Su esquema actual está orientado a referencias generales/del estudio y no contiene las columnas necesarias para almacenar el catálogo nacional completo ni sus relaciones.
- Las políticas observadas permiten lectura autenticada de fuentes globales; las escrituras existentes exigen `firm_id` no nulo y rol del estudio. Por ello no se debe insertar el catálogo global en esta tabla desde el cliente.
- Security Advisor y Health Advisor devolvieron cero alertas en esta consulta. Esto no sustituye pruebas funcionales ni una revisión jurídica.
- Se consultó la documentación de Supabase: Free incluye cuota de 500 MB de base de datos por proyecto y 1 GB de Storage. La estrategia de importación debe medir el tamaño real después de un piloto y detenerse antes de comprometer la cuota.


## Actualización de estado — 6 de noviembre de 2026

- Se recibió el CSV completo SAIJ y se validó de forma independiente: 81.674 filas, 12 columnas, 23 provincias + CABA. SHA-256 y métricas en `docs/VALIDACION_CSV_SAIJ_PROVINCIAL_2026-11-05.md`.
- Se identificó una fila incompleta (línea 13.006, Chubut, Ley 9, sin `nombre_norma`) y 285 grupos candidatos de conflicto (1.423 filas). No se corrigió ni fusionó ningún registro sin respaldo de la fuente.
- Se volvió a contrastar la totalidad de los ZIP Infoleg: 377.106 relaciones únicas, conjuntos coincidentes entre ambos archivos complementarios y cero IDs de relación ausentes del catálogo nacional.
- El importador de relaciones complementarias y sus pruebas están en el repositorio. GitHub Actions completó correctamente `npm test` y `npm run build` en el commit `b23350f85ee04bac5c827861a1324fcd3c27e744`; ambos workflows finalizaron en `success`. El commit documental posterior `70ab5e2df29ae424697c991337834e3685ed73a3` aún no tiene una ejecución de CI confirmada.
- La ejecución de los importadores Node.js sobre los cuatro archivos completos terminó correctamente en el workflow `42261459866`; tampoco se ha importado el catálogo a Supabase.
- Rama `architecture/national-foundation`: 231 commits por delante de `main`, 0 por detrás al momento de la consulta. PR #1 permanece abierto y sin fusionar.
- No se realizaron escrituras en Supabase, no se publicaron datos, no se habilitó IA externa ni servicios pagos.


## Actualización técnica verificada — 6 de noviembre de 2026

- 50/50 migraciones SQL coinciden exactamente con el historial remoto por Git blob SHA-1.
- Workflow integral de corpus v3 `42261459866`: éxito. Recuento: 81.673 normas provinciales válidas + 429.059 nacionales = 510.732; relaciones canónicas: 377.106; cobertura SAIJ: 23 provincias + CABA; una fila incompleta queda informada y no se inventa.
- Archivos JSONL v3: normas 438.565.617 bytes; relaciones 37.061.813 bytes; total 475.627.430 bytes. Son archivos de intercambio y no deben compararse directamente con la cuota de almacenamiento PostgreSQL.
- CI `42261471511`: éxito en HEAD `398ce5f0c2028677d24c8dc7ca3f598e93a8e970`.
- El esquema SQL v3 del catálogo sigue como propuesta no aplicada. Falta estimar heap e índices reales, probar un lote piloto reversible y verificar la recuperación. No cargar el catálogo masivo antes de esa etapa.
- IA generativa externa desactivada; no se envían documentos ni expedientes a proveedores externos. El chat generativo no está implementado.
- La jurisprudencia nacional/provincial tiene directorios y portales oficiales, pero no un corpus completo importado.
- No se hizo despliegue, fusión de PR, ni activación de servicios pagos.


## Medición física del catálogo v4 — 6 de noviembre de 2026

- PostgreSQL 17.11 temporal cargó y validó 510.732 normas + 377.106 relaciones con índices: 302,37 MiB de catálogo.
- Estimación con la base de desarrollo previa: 315,26 MiB; queda 34,74 MiB por debajo del límite preventivo de 350 MiB.
- Workflow `42263728893` y CI `42263736718` terminaron en `success`.
- Informe reproducible: `docs/INFORME_MEDICION_POSTGRESQL_CATALOGO_2026-11-06.md`.
- La medición temporal no equivale a una carga en Supabase. El esquema y la importación permanecen pendientes hasta generar una migración con CLI y un canal de carga por lotes, idempotente y reversible, sin exponer secretos.
