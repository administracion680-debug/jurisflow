# JurisFlow Argentina

Plataforma nacional de gestión jurídica para estudios y profesionales. Se construye por etapas con prioridad en confidencialidad, permisos por expediente y fuentes jurídicas verificables.

## Desarrollo

```bash
npm ci
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
- **Extracción documental local:** PDF, DOCX, XLSX y PPTX; OCR en español para PDF escaneados e imágenes JPG/PNG. XLSX/PPTX se procesan localmente con límites de tamaño y descompresión; los formatos binarios antiguos XLS/PPT se almacenan, pero no se indexan.
- **Agenda:** eventos, audiencias, reuniones y vencimientos vinculados a expedientes.
- **Honorarios:** importes ARS, registro de pagos y saldos, con acceso financiero por rol.
- **Biblioteca jurídica:** fuentes del estudio y verificación manual. Incluye enlaces a SAIJ, Base SAIJ de Normativa Provincial, directorio oficial de Justicia.ar de portales provinciales/CABA y Base de Datos Legislativos Infoleg (datos abiertos nacionales). Los catálogos enlazan a sus fuentes oficiales; no equivalen a importar automáticamente todos los textos ni a certificar su vigencia individual.
- **Investigación:** búsqueda privada por expediente en fuentes verificadas y fragmentos indexados.
- **Auditoría:** historial por estudio de altas, modificaciones y bajas de clientes, expedientes, documentos, agenda, honorarios, pagos, integrantes y fuentes; solo titular/administradores. Registra metadatos y campos modificados, nunca contenido de expedientes ni documentos.

## Importación de normativa provincial SAIJ

Se incluye un importador de solo lectura para preparar el catálogo provincial desde el CSV oficial. Ejecutar primero `npm test` y luego:

```bash
npm run import:saij:provincial -- --updated-through AAAA-MM-DD
```

El comando conserva el CSV original, calcula SHA-256 y genera un informe de calidad y registros JSONL en `artifacts/saij-provincial/`. También acepta una ruta a un CSV descargado manualmente como primer argumento. No escribe en Supabase ni marca normas como verificadas. Revisar `docs/INGESTA_SAIJ_NORMATIVA_PROVINCIAL.md` antes de cualquier carga.

## Importación de normativa nacional Infoleg

Se incluye un importador de solo lectura para el ZIP oficial completo de Infoleg. Descargar el ZIP desde el [dataset oficial](https://datos.jus.gob.ar/dataset/base-de-datos-legislativos-infoleg) y ejecutar:

```bash
npm run import:infoleg:national -- ./base-infoleg-normativa-nacional.zip --updated-through AAAA-MM-DD
```

El comando detecta el CSV dentro del ZIP por sus encabezados oficiales, conserva ZIP y CSV originales, calcula SHA-256 y genera informe y registros JSONL en `artifacts/infoleg-national/`. No utiliza la muestra de 1.000 filas como base completa, no escribe en Supabase y no marca normas como verificadas. Ver [documentación de ingesta Infoleg](docs/INGESTA_INFOLEG_NACIONAL.md).

## Fuentes de jurisprudencia

La biblioteca ofrece acceso a la Secretaría de Jurisprudencia de la CSJN, CIJ, SAIJ y el [directorio oficial de sentencias por jurisdicción](https://tramites.csjn.gov.ar/herramientas/sentencias), que reúne enlaces nacionales, provinciales y de CABA. No se presenta un catálogo de enlaces como si fuera una base completa de fallos. Ver [inventario de fuentes jurisprudenciales](docs/FUENTES_JURISPRUDENCIA_ARGENTINA.md).

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
- [Auditoría técnica Supabase del 6/11/2026](docs/REVISION_TECNICA_SUPABASE_2026-11-06.md)
- [Pruebas de seguridad y aceptación](docs/PRUEBAS_SEGURIDAD.md)
- [Estado de implementación y pendientes](docs/ESTADO_IMPLEMENTACION.md)
- [Asistente IA y privacidad](docs/ASISTENTE_IA_Y_PRIVACIDAD.md)

## Configuración y límites

El frontend usa la URL del proyecto Supabase y una clave publishable pública. Se pueden sobrescribir con VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY. Las migraciones nuevas creadas en esta rama están versionadas en supabase/migrations. Las migraciones de bootstrap anteriores ya existían en el proyecto Supabase y todavía falta recuperar su SQL original; por eso no se puede reconstruir una base vacía únicamente con los archivos actuales.

Se conserva el proyecto Supabase existente en plan Free. No se activaron servicios pagos ni se usó Bolt. El plan Free no incluye backups automáticos ni garantías de continuidad productiva.

## Antes de producción

No cargar expedientes reales hasta aplicar y verificar el hardening de privilegios SQL, completar las pruebas funcionales de Storage, Auth/redirects, OCR y UI, recuperar/versionar el baseline de migraciones, definir y probar backup/restauración, revisar privacidad y validar el despliegue. La ausencia de alertas del Security Advisor no certifica la aplicación.


### Ingesta de relaciones normativas Infoleg

La ingesta de las bases complementarias de normas modificadas y modificatorias está documentada en [docs/INGESTA_INFOLEG_COMPLEMENTARIA.md](docs/INGESTA_INFOLEG_COMPLEMENTARIA.md). El proceso verifica simetría de relaciones y existencia de identificadores en la base nacional; genera artefactos locales y no escribe en Supabase.
