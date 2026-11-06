# Arquitectura propuesta del catálogo legislativo masivo

Fecha de revisión: 6 de noviembre de 2026.

## Decisión de arquitectura

No importar los corpus completos de Infoleg o SAIJ en `public.legal_library`.

La tabla `legal_library` existente es una biblioteca curada y pequeña: en la inspección del proyecto de desarrollo tenía 14 filas globales y columnas de título, tipo, jurisdicción, cita, URL, resumen y verificación. Sus políticas permiten lectura a usuarios autenticados de registros globales y escrituras de registros ligados a un estudio. No es una tabla de ingestión masiva ni un catálogo nacional normalizado.

El corpus masivo debe tener tablas independientes, sin mezclar:
- referencias curatoriales de la aplicación;
- normativa nacional Infoleg;
- normativa provincial SAIJ (23 provincias y CABA);
- relaciones de modificación entre normas;
- documentos y expedientes privados de los estudios.

## Modelo lógico propuesto (todavía no migrado)

### 1. `legal_norms` — catálogo normalizado

Una fila representa una identidad de norma dentro de una fuente. Campos previstos:
- `id` UUID interno.
- `source_code`: `infoleg_national` o `saij_provincial`.
- `source_record_id`: identificador oficial cuando exista (Infoleg).
- `source_record_key`: clave determinística de la fila fuente; para SAIJ debe preservar los conflictos, no resolverlos por suposición.
- `candidate_identity_key`: agrupador para posibles coincidencias (jurisdicción, tipo, número y fecha), nunca una orden de fusión.
- `jurisdiction_code`, `jurisdiction_name`, `norm_type`, `norm_number`, `norm_class`, `issuing_authority`.
- `enactment_date`, `publication_date`, `bulletin_number`, `bulletin_page`.
- `title`, `summary`, `source_status`, `source_status_as_of`.
- `original_text_url`, `updated_text_url`.
- `source_payload` JSONB, `source_row_hash`, `source_file_sha256`, `source_row_number`, `source_license`.
- `verification_status` con valor inicial `pending`; la etiqueta de vigencia del organismo no equivale a verificación jurídica propia.
- `captured_at`, `created_at`, `updated_at`.

La clave de fuente y las claves candidatas deben ser distintas: dos filas con misma jurisdicción/tipo/número/fecha pueden ser conflictos y deben permanecer visibles para revisión. Los identificadores oficiales estables de Infoleg se conservan como tales; nunca se sustituyen por una identidad inferida.

### 2. `legal_norm_relationships` — relaciones entre normas

Una fila representa una relación dirigida:
- `modifying_norm_id` — norma que modifica.
- `modified_norm_id` — norma modificada.
- `relation_type` (inicialmente `modifies`).
- `source_code`, `source_file_sha256`, `source_row_number`, `source_payload`.
- `verification_status` inicial `pending`.

La identidad lógica de una relación es el par dirigido; la procedencia de cada observación se conserva por separado. Los dos ZIP complementarios de Infoleg son vistas inversas del mismo conjunto: deben compararse, no sumarse como si fueran relaciones distintas. La salida canónica no debe borrar las filas originales ni sus duplicados.

### 3. `legal_import_batches` — control de lotes

Cada ejecución futura debe registrar:
- fuente, recurso, fecha de captura, fecha de corte declarada;
- nombre de archivo, SHA-256, licencia y URL oficial;
- versión del importador;
- filas leídas, aceptadas, rechazadas, duplicados y conflictos;
- estado del lote: preparado, validado, aplicado o revertido;
- resumen de validaciones y actor/fecha de ejecución.

Cada registro importado debe poder rastrearse al lote, archivo y número de fila. La reversión debe poder desactivar o retirar únicamente los registros creados por ese lote, sin borrar registros preexistentes ni expedientes privados.

## Seguridad y acceso

- Tablas de catálogo global: lectura autenticada, sin permisos de escritura desde el cliente.
- No habilitar INSERT/UPDATE/DELETE a `anon` ni a usuarios autenticados ordinarios.
- La ingestión futura debe ejecutarse desde un proceso controlado del lado servidor, con credenciales nunca incluidas en el navegador y privilegios mínimos.
- RLS habilitado en todas las tablas expuestas; las políticas se revisarán con el esquema real y se probarán con dos usuarios/estudios.
- No reutilizar políticas de `legal_library` para estas tablas.
- No almacenar expedientes, datos de clientes, conversaciones privadas ni documentos de estudios en el catálogo global.
- No añadir funciones `SECURITY DEFINER` para sortear RLS.
- Mantener separación entre datos globales de acceso público y material privado por estudio.

## Idempotencia, duplicados y reversión

1. Descargar y preservar el archivo oficial exacto.
2. Calcular SHA-256 y registrar metadatos del lote.
3. Ejecutar el importador fuera de Supabase y revisar el informe.
4. Validar esquema, identificadores, fechas, jurisdicciones, filas rechazadas, relaciones simétricas y referencias ausentes.
5. Probar el lote en un entorno aislado con un subconjunto pequeño y ficticio.
6. Aplicar mediante claves estables y transacción/lotes controlados.
7. Comparar recuentos antes/después y ejecutar consultas de integridad.
8. Marcar el lote como aplicado solo si todas las verificaciones coinciden.
9. Probar reversión en entorno aislado antes de cualquier carga real.

No usar `ON CONFLICT DO NOTHING` como estrategia general: puede ocultar conflictos de contenido. Las filas repetidas exactas, las filas con mismo identificador pero contenido diferente y las coincidencias candidatas deben contabilizarse por separado.

## Alcance real de los archivos recibidos

Los importadores generan metadatos normalizados, conservan los registros fuente y sus URLs. No descargan ni certifican automáticamente el texto jurídico completo de cada enlace. La cobertura de metadatos no debe presentarse como cobertura de texto íntegro, vigencia confirmada o jurisprudencia.

## Estado al 6 de noviembre de 2026

- `legal_library`: 14 filas globales, 0 filas asociadas a estudios en la inspección de desarrollo.
- RLS habilitado en `legal_library`; lectura autenticada de filas globales y escritura condicionada a pertenencia/rol del estudio para filas con `firm_id`.
- Los tres ZIP de Infoleg y el CSV completo de SAIJ fueron inspeccionados de forma independiente y sus resultados se documentaron.
- Importadores Node.js: pruebas automatizadas y compilación confirmadas en el commit `119aa040df68fe260daf5215b32b035499b30ecd`. Los cambios posteriores de preservación de filas fuente están sujetos a CI en el HEAD más reciente.
- No se ejecutó todavía el importador Node.js con los cuatro archivos completos recibidos.
- No se crearon tablas ni se cargaron registros en Supabase.
- No se hizo merge ni publicación.

## Próximas verificaciones obligatorias

- CI verde sobre el HEAD actual.
- Ejecución real de los tres importadores con archivos completos, comparando los informes con las validaciones independientes.
- Revisión de la estructura final y políticas RLS de las tablas propuestas.
- Prueba de lote pequeño, idempotencia y reversión.
- Revisión de cuotas gratuitas y espacio de almacenamiento antes de cualquier operación. No activar planes pagos.
