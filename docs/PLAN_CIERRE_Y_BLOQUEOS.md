# Plan de cierre y bloqueos reales — JurisFlow Argentina

Actualizado: 6 de noviembre de 2026, 17:44 ART  
Rama: `architecture/national-foundation`  
HEAD verificado: `29cba352f40ef8e59ad9329bdc47f2e97788e81d`  
PR #1: abierto, sin fusionar.

Este documento separa el trabajo ya validado de lo que requiere infraestructura, pruebas con cuentas reales, decisiones de privacidad o autorización. No presenta como terminada una función que solo tenga tablas o documentación.

## Terminado y verificado

- Aplicación React/Vite conectada a Supabase con registro/login/recuperación, estudios, miembros y roles.
- Clientes, expedientes con jurisdicción/tribunal, permisos por expediente, documentos privados, agenda, vencimientos, honorarios/pagos, biblioteca jurídica, búsqueda FTS por expediente y auditoría.
- Extracción local de PDF/DOCX/XLSX/PPTX e OCR local para PDF escaneados e imágenes; límites de tamaño y procesamiento documentados.
- Base de datos: 50/50 migraciones remotas cotejadas con los archivos de GitHub, byte por byte; 0 faltantes y 0 diferencias.
- 18 tablas públicas con RLS habilitado; 0 tablas públicas sin RLS; 62 políticas públicas.
- Security Advisor: 0 hallazgos.
- Bucket de documentos privado; límite 20 MiB; políticas de lectura/escritura vinculadas a estudio y expediente.
- Pruebas SQL previas de privilegios, aislamiento entre dos estudios ficticios y auditoría pasaron con datos de prueba revertidos.
- CI del HEAD actual: workflow `42291402125` = success (instalación fijada, auditoría de dependencias de producción, sintaxis, pruebas y build).
- Validación integral del corpus: workflow `42264919372` = success. Descargas oficiales, importadores y validaciones completadas.
- Corpus validado: 510.732 normas válidas (81.673 SAIJ provincial + 429.059 Infoleg nacional) y 377.106 relaciones canónicas simétricas.
- Benchmark PostgreSQL 17.11 temporal: 302,37 MiB de catálogo con índices; estimación sumada a la base actual: 315,26 MiB, por debajo del presupuesto preventivo de 350 MiB.

## Pendiente técnico bloqueante

### 1. Incorporar el catálogo nacional a Supabase

El benchmark se hizo en una base temporal. El esquema propuesto y los datos NO están cargados en Supabase. Antes de importar se necesita:
- generar la migración con Supabase CLI desde el repositorio y revisar el diff;
- comprobar compatibilidad de claves/relaciones con el esquema final;
- implementar una carga server-side por lotes, idempotente y reanudable, sin exponer `service_role`;
- implementar reversión por lote y verificación de hashes/conteos;
- hacer piloto en el proyecto de desarrollo y medir `pg_database_size` después de índices y ANALYZE;
- detener la carga si supera 350 MiB o el presupuesto restante acordado.

La estimación deja 34,74 MiB de margen hasta el umbral preventivo. No se debe asumir que el tamaño real de Supabase será idéntico al benchmark temporal.

### 2. Pruebas reales de Auth y Storage

El proyecto Supabase actualmente tiene 0 usuarios, 0 objetos en el bucket y 0 filas de auditoría. Por eso no se puede declarar aprobado un recorrido de navegador con sesiones reales. Faltan dos cuentas ficticias independientes, dos estudios de prueba, confirmación de correo, invitación, recuperación de contraseña, carga/descarga/actualización/eliminación de archivos y comprobación de aislamiento cruzado.

### 3. IA generativa jurídica

La base de conversaciones, mensajes y citas está preparada, y existe búsqueda FTS privada por expediente. Pero NO hay modelo generativo conectado. La IA generativa está desactivada para evitar enviar expedientes confidenciales a proveedores externos gratuitos que pueden retener o usar datos. Para habilitar respuestas generativas hay que elegir y probar una opción de inferencia local/privada o aprobar explícitamente un proveedor y sus condiciones de tratamiento. No se deben inventar respuestas ni simular que una búsqueda FTS es una IA.

### 4. Jurisprudencia nacional y provincial

Hay portales oficiales y directorios por jurisdicción, pero no un corpus completo de fallos de las 23 provincias, CABA, justicia nacional y federal. Se requiere inventario jurisdiccional, reglas de acceso/descarga, metadatos, deduplicación, derechos de reutilización y revisión de cobertura. No hacer scraping indiscriminado ni etiquetar un directorio como corpus completo.

### 5. Rendimiento y mantenimiento

Performance Advisor informa un hallazgo INFO: falta un índice parcial para `audit_logs.actor_id`; existe propuesta en `docs/sql-proposals/index_audit_logs_actor_id.sql`, aún no aplicada. También informa 23 índices sin uso, esperable en un proyecto sin tráfico; no eliminarlos sin carga representativa. La migración del índice debe generarse con Supabase CLI y probarse.

### 6. Privacidad, continuidad y operación

Faltan revisión profesional de privacidad/secreto profesional/condiciones de uso, prueba de backup y restauración, retención/exportación/borrado de datos, monitoreo y procedimiento de incidentes. No cargar datos reales ni expedientes confidenciales hasta cerrar estos controles.

### 7. Validación de interfaz y publicación

Faltan recorridos e2e en navegador/dispositivo Android real, accesibilidad, pruebas de errores y carga con cuentas ficticias. El PR #1 permanece abierto y no fusionado. No se publica en producción ni se activa ningún servicio pago sin autorización explícita.

## Límites de esta etapa

- No se activaron servicios pagos ni APIs de IA externas.
- No se importó el catálogo a Supabase.
- No se crearon usuarios ni documentos reales.
- No se fusionó el PR ni se publicó la aplicación.
- La validación de CI/build no equivale a certificación de seguridad ni a aprobación legal para uso profesional.

## Criterio para declarar JurisFlow listo

Solo se podrá declarar listo para piloto cuando el catálogo esté cargado de forma reversible dentro del presupuesto, Auth/Storage hayan pasado e2e con cuentas ficticias, se haya probado el aislamiento multiestudio, exista política de backups/recuperación y el responsable jurídico haya aprobado privacidad y secreto profesional. La IA generativa y el corpus de jurisprudencia deben seguir claramente identificados como pendientes hasta que sus pruebas y fuentes estén completas.


## Revalidación de seguridad en el proyecto de desarrollo

El 6 de noviembre de 2026 se volvieron a ejecutar directamente en Supabase, como propietario de base de datos y con fixtures ficticios revertidos:

- `supabase/tests/public_schema_privileges.sql`: pasó, sin excepciones.
- `supabase/tests/rls_two_firms.sql`: pasó; la prueba cubre aislamiento entre dos estudios, expedientes, Storage y conversaciones IA; transacción revertida.
- `supabase/tests/audit_trail.sql`: pasó; valida registro metadata-only y restricciones por rol; transacción revertida.

Después de las pruebas se verificó que `auth.users=0`, `storage.objects=0`, `audit_logs=0` y que la base continúa en 13.522.611 bytes. CI del HEAD previo `e8d28df47a5c101d04cb15917850f5f62fd7abb5`, workflow `42291520369`, terminó en success (auditoría de dependencias, tests y build). La documentación de este commit final también queda sujeta al CI de su propio HEAD.
