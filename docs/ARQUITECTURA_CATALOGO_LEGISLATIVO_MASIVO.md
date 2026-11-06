# Arquitectura del catálogo legislativo masivo

Fecha de revisión: 6 de noviembre de 2026.

## Decisión de arquitectura

No importar los corpus completos de Infoleg o SAIJ en `public.legal_library`.

La tabla `legal_library` existente es una biblioteca curada y pequeña: 14 filas globales en la inspección de desarrollo. No es una tabla de ingestión masiva. El catálogo nacional debe estar separado de:
- referencias curatoriales de la aplicación;
- expedientes, clientes, documentos y conversaciones privadas de los estudios;
- normativa nacional Infoleg;
- normativa provincial SAIJ (23 provincias y CABA);
- relaciones de modificación entre normas.

## Modelo lógico propuesto (todavía no migrado)

### 1. `public.legal_norms` — filas fuente normalizadas

Una fila representa una observación de norma de una fuente, no una identidad jurídica deduplicada.

Campos previstos:
- `id` UUID interno.
- `source_code`: `infoleg_national` o `saij_provincial`.
- `source_record_key`: clave determinística única de la fila fuente (por ejemplo, fuente + SHA-256 del archivo + número de fila).
- `source_record_id`: identificador oficial cuando exista (Infoleg); puede repetirse y no es una clave única.
- `candidate_identity_key`: agrupador de posibles coincidencias por jurisdicción, tipo, número y fecha; nunca una orden de fusión.
- `jurisdiction_code`, `jurisdiction_name`, `norm_type`, `norm_number`, `norm_class`, `issuing_authority`.
- `enactment_date`, `publication_date`, `bulletin_number`, `bulletin_page`.
- `title`, `source_status`, `source_status_as_of`.
- `original_text_url`, `updated_text_url`.
- `source_row_hash`, `source_file_sha256`, `source_row_number`, `source_license`, `batch_id`.
- `verification_status` inicial `pending`; el estado informado por el organismo no equivale a verificación jurídica propia.
- `captured_at`, `created_at`, `updated_at`.

**No almacenar el registro fuente completo en JSONB, el texto íntegro de la norma ni los resúmenes extensos en esta tabla.** Para mantener el uso de Supabase gratuito bajo control, se conservan solo campos normalizados y procedencia (hash del archivo, hash de fila y número de fila). El archivo original permanece en la fuente oficial/archivo de lote y los textos se consultan desde sus URLs oficiales. Así se preserva trazabilidad sin duplicar cientos de miles de filas de JSON.

Los identificadores oficiales estables se conservan literalmente. Las filas con el mismo ID pero metadatos distintos permanecen visibles como observaciones separadas. Los duplicados exactos y conflictos se contabilizan; no se fusionan automáticamente.

### 2. Observaciones fuente de relaciones — archivo externo, no tabla de Supabase

Los dos ZIP complementarios contienen 765.599 observaciones, incluidos duplicados. Se conservan como recursos oficiales descargables, identificados por SHA-256, licencia, URL y conteos en el manifiesto del lote. **No se importan individualmente a Supabase**: ocupan espacio y repiten información que puede resumirse en la relación canónica. Si en el futuro se necesita auditoría fila por fila, se genera un archivo externo opcional con `--include-observations`, nunca una tabla masiva por defecto.

### 3. `public.legal_norm_relationships` — relaciones dirigidas canónicas

Una fila por par dirigido único:
- `source_code`, `modifying_source_record_id`, `modified_source_record_id`, `relation_type` (inicialmente `modifies`).
- `observation_count`, `verification_status`, `created_at`, `updated_at`.

Clave única propuesta: fuente + ID modificador + ID modificado + tipo de relación. Los dos ZIP complementarios son vistas inversas del mismo conjunto: se comparan, no se suman como relaciones distintas. La tabla canónica tendrá 377.106 relaciones únicas; las observaciones de origen se preservan en los archivos oficiales externos y sus conteos/hash, no en una tabla de Supabase.

### 4. `private.legal_import_batches` — control de lotes

Cada recurso/archivo registra:
- fuente, recurso, fecha de captura y fecha de corte declarada;
- nombre de archivo, SHA-256, licencia y URL oficial;
- versión del importador;
- filas leídas, aceptadas, rechazadas, duplicados y conflictos;
- estado: preparado, validado, aplicado o revertido;
- informe de validación y actor/fecha de ejecución.

Cada fila importada debe poder rastrearse al lote, archivo y número de fila. La reversión debe retirar únicamente los registros creados por ese lote, sin borrar filas previas ni expedientes privados.

## Seguridad y acceso

- `public.legal_norms` y `public.legal_norm_relationships`: lectura autenticada; conceder explícitamente solo `SELECT` a `authenticated`; sin acceso para `anon` ni INSERT/UPDATE/DELETE para usuarios ordinarios.
- `private.legal_norm_relationship_observations` y `private.legal_import_batches`: fuera del Data API, sin permisos para roles de navegador; acceso exclusivo del proceso de ingesta y operadores autorizados.
- La ingesta debe ejecutarse del lado servidor con credenciales nunca incluidas en el navegador y privilegios mínimos.
- RLS habilitado en todas las tablas expuestas y pruebas con dos estudios.
- Desde el 30/10/2026 las tablas nuevas ya no se exponen automáticamente al Data API; el acceso requiere GRANT explícito y RLS. Fuente: https://supabase.com/changelog?types=breaking-change.
- No reutilizar políticas de `legal_library` para estas tablas.
- No almacenar expedientes, clientes, conversaciones ni documentos privados en el catálogo global.
- Funciones privilegiadas en esquema `private`; no usar `SECURITY DEFINER` para sortear RLS.

## Idempotencia, duplicados y reversión

1. Descargar y preservar cada recurso oficial exacto.
2. Calcular SHA-256 y registrar metadatos del lote.
3. Ejecutar los importadores fuera de Supabase y revisar informes.
4. Validar esquema, IDs, fechas, jurisdicciones, filas rechazadas, duplicados, relaciones simétricas y referencias ausentes.
5. Cargar primero en staging, sin publicar el lote.
6. Validar conteos y relaciones; activar el lote solo si todas las aserciones coinciden.
7. Mantener el lote anterior hasta confirmar el nuevo; probar reversión antes de producción.
8. Repetir el mismo archivo no debe duplicar filas.

No usar `ON CONFLICT DO NOTHING` como estrategia general: puede ocultar conflictos de contenido. La clave de fila debe ser distinta de la clave candidata de identidad jurídica.

## Alcance y límites

Los archivos contienen metadatos y enlaces; no descargan ni certifican automáticamente el texto jurídico completo. La cobertura de metadatos no debe presentarse como cobertura de texto íntegro, vigencia confirmada ni jurisprudencia. La fuente SAIJ informa estados y fechas de corte que deben mostrarse como datos del organismo.

## Preparación compacta para importación

El script `scripts/prepare-legal-catalog-import.mjs` genera tres archivos JSONL sin `source_record` ni payload bruto:
- `legal-norms.jsonl`: filas normalizadas Infoleg + SAIJ.
- `legal-norm-relationship-observations.jsonl`: cada observación de ambos ZIP.
- `legal-norm-relationships.jsonl`: pares canónicos con `observation_count`.

También genera `manifest.json` con conteos, tamaños y SHA-256 de cada salida. El proceso es streaming y no conecta con Supabase. El esquema SQL propuesto está en `docs/sql-proposals/create_legal_catalog.sql`; la prueba de acceso está en `supabase/tests/legal_catalog_security.sql`. Son propuestas no aplicadas, no migraciones registradas.

## Tamaño real de los artefactos y presupuesto de base

En la ejecución reproducible con `npm ci` se midieron los archivos completos generados en GitHub Actions:

| Salida | Tamaño |
| --- | ---: |
| CSV SAIJ original | 28 MB |
| JSONL SAIJ normalizado con fila fuente | 115 MB |
| CSV Infoleg nacional original | 246 MB |
| JSONL Infoleg nacional normalizado con fila fuente | 955 MB |
| CSV complementarios Infoleg | 123 MB |
| JSONL de todas las observaciones de relaciones | 543 MB |
| JSONL de relaciones canónicas | 31 MB |
| ZIP oficiales combinados | 67 MB |

El conjunto histórico de artefactos de validación llegó a rondar **2,2 GB** al incluir todas las observaciones y textos. La preparación por defecto ahora omite los resúmenes extensos y el JSONL de observaciones duplicadas; el tamaño final reducido debe medirse en la próxima ejecución integral antes de estimar la carga. No guardar JSONL fuente ni `source_payload` completo dentro de Supabase. Los archivos fuente se pueden volver a descargar desde los portales oficiales; la base debe conservar la URL, licencia, SHA-256 y número de fila.

Antes de importar se debe confirmar el límite real del proyecto gratuito y fijar un presupuesto conservador: detener la carga si la base alcanza 70% de la cuota gratuita o 350 MB, lo que ocurra primero. No activar un plan pago ni intentar almacenar los JSONL completos en la base.

## Operación de migraciones y CLI

Supabase CLI v3 fue publicado el 02/11/2026. Los comandos de base de datos apuntan a la pila local por defecto; para un proyecto alojado se requiere `--remote`. Los cambios remotos ejecutados sin terminal requieren `--yes` y consentimiento explícito. Antes de usar CLI se debe revisar la guía oficial de migración v3 y fijar versión; no ejecutar `db pull --remote --yes` ni modificar historial remoto sin autorización y revisión del SQL generado.

Fuente oficial: https://supabase.com/docs/guides/local-development/cli/migrating-to-v3.

## Presupuesto Supabase Free y estrategia de carga

La página oficial de precios indica para Free **500 MB de base de datos por proyecto**, **2 GB de disco** y **1 GB de Storage**. El límite de 500 MB de base de datos es distinto del límite físico de disco; el WAL también consume disco y una carga masiva puede provocar modo de solo lectura si el disco se llena. Supabase recomienda dividir escrituras grandes en lotes pequeños para controlar el WAL y crear índices secundarios después de la carga.

- Referencias oficiales: https://supabase.com/pricing y https://supabase.com/docs/guides/platform/database-size.
- Última medición previa al catálogo: aproximadamente 13 MB de base de datos.
- Presupuesto conservador propuesto: detener si la base supera 350 MB (70% de la cuota de 500 MB) o si el disco supera 70% de 2 GB, lo que ocurra primero.
- Importar en lotes pequeños y confirmar tamaño/WAL entre lotes; no ejecutar una transacción única con más de 1,6 millones de filas.
- Crear índices secundarios y el GIN de texto después de cargar y validar los datos.
- Si el manifiesto compacto más la estimación de índices no cabe con margen dentro del presupuesto, mantener las observaciones de relaciones en un archivo abierto versionado fuera de Supabase y cargar solo las normas y relaciones canónicas necesarias para búsqueda.

No activar upgrades, compute adicional ni servicios pagos para completar la carga.

## Procedencia técnica de cada fila

Los tres importadores agregan claves determinísticas por archivo y número de fila, SHA-256 del archivo fuente y SHA-256 del contenido original de cada fila. El workflow integral verifica estas propiedades sobre cada registro emitido, no solo los conteos agregados. La salida JSONL conserva el objeto original para auditoría fuera de Supabase; el futuro esquema SQL debe guardar únicamente campos normalizados y hashes/metadatos compactos.

## Estado al 6 de noviembre de 2026

- `legal_library`: 14 filas globales en el proyecto de desarrollo.
- RLS habilitado en las 18 tablas públicas inspeccionadas; no hay clientes, causas, documentos ni objetos de Storage de usuarios cargados.
- Los cuatro recursos oficiales completos pasaron SHA-256.
- **SAIJ:** 81.674 filas; 81.673 válidas; 1 incompleta; 24 jurisdicciones (23 provincias + CABA).
- **Infoleg nacional:** 430.834 filas; 429.059 normalizadas; 1.775 filas con errores de campos obligatorios; 4.509 grupos de IDs repetidos.
- **Relaciones:** 380.481 observaciones de normas modificatorias y 385.118 de normas modificadas; 377.106 relaciones únicas coincidentes; cero errores; simetría completa; todos los IDs resuelven contra 426.144 IDs nacionales únicos.
- Validación integral aprobada en GitHub Actions, run `42208726044`. El artefacto contiene solo informes JSON; no se publicó el corpus.
- Los importadores son de solo lectura respecto de Supabase. **No se crearon aún las tablas masivas ni se importaron registros en la base.**
- No se hizo merge ni publicación.

## Bloqueos y próximos pasos

1. Aplicar y probar la migración de hardening de privilegios: 14 tablas públicas conceden actualmente `TRUNCATE`, `REFERENCES`, `TRIGGER` y `MAINTAIN` a roles de navegador; RLS no protege frente a `TRUNCATE`.
2. Recuperar/versionar 21 SQL de migraciones que figuran en el historial remoto pero no están en GitHub; dos migraciones fueron alineadas por timestamp a partir de su nombre lógico, pero no se pudo comparar el SQL original ejecutado.
3. Crear las tablas masivas con RLS y permisos de solo lectura; diseñar carga por lotes desde servidor y rollback.
4. Medir el tamaño real del lote y del índice antes de cargar; mantener margen en el plan gratuito y no activar servicios pagos.
5. Ejecutar pruebas RLS de dos estudios, auditoría, Storage API, Auth/redirects y restauración.
6. Revisar privacidad, secreto profesional y transferencia internacional de datos: el proyecto actual está en `us-west-2`, Estados Unidos.
7. La IA generativa sigue deshabilitada: no hay proveedor/modelo integrado; no exponer credenciales ni documentos a servicios externos sin autorización.

No declarar el catálogo nacional como importado o listo para producción hasta cerrar estos controles.


## Reducción de almacenamiento aplicada en el código (6/11/2026)

- La salida compacta de normas deja `summary` en `null`: los resúmenes largos y textos permanecen en la fuente oficial y no se duplican en PostgreSQL.
- La preparación por defecto ya no crea `legal-norm-relationship-observations.jsonl`; mantiene el conteo de 765.599 observaciones en el manifiesto y carga únicamente 377.106 relaciones canónicas con `observation_count`.
- La exportación externa completa de observaciones queda disponible bajo demanda con `--include-observations`; no debe importarse en Supabase Free.
- Se elevó `schema_version` del manifiesto a 2 y se actualizaron las aserciones del workflow para exigir la omisión por defecto.
- Pendiente: ejecutar nuevamente la validación completa, medir el tamaño real de los dos JSONL reducidos y revisar el tamaño de tabla/índices en un piloto antes de cualquier importación.
