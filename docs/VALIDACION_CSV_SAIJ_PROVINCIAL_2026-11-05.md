# Validación del CSV completo SAIJ de normativa provincial

**Fecha de inspección del archivo:** 5 de noviembre de 2026  
**Fuente:** Ministerio de Justicia / Sistema Argentino de Información Jurídica (SAIJ)  
**Dataset:** https://datos.jus.gob.ar/dataset/base-saij-de-normativa-provincial  
**Recurso:** https://datos.jus.gob.ar/dataset/d59c2d29-d561-4ad2-a032-cc82b40db2d3/resource/0ebc70cc-0e71-4158-ab75-9759339e4cbd/download/base-saij-normativa-provincial.csv  
**Licencia declarada:** CC BY 4.0  
**SHA-256 del CSV recibido:** `75b419318a31093f674ca604b8f787d475f340c043f4d81cf9e25562a4e3dba2`  
**Tamaño:** 28.598.769 bytes.

## Resultado de estructura e integridad

- 81.674 filas de datos y 12 columnas oficiales.
- Codificación UTF-8 con BOM; encabezados coincidentes con la documentación de SAIJ.
- 24 jurisdicciones: las 23 provincias y la Ciudad Autónoma de Buenos Aires.
- 81.673 filas cumplen los campos mínimos exigidos por el importador actual (provincia, tipo y nombre de norma); una fila no tiene `nombre_norma` y debe quedar informada como error, no descartarse silenciosamente.
- No se detectaron fechas no normalizables en los campos `fecha` y `fecha_publicacion`.
- `informacion_digesto` está vacío en las 81.674 filas; `titulo_resumido` está vacío en 16.501; `fecha_publicacion` en 1.731; `titulo_sumario` en 122; `nombre_norma` en 1.
- Los 24 valores de jurisdicción pudieron identificarse en el archivo; CABA aparece como jurisdicción autónoma y no debe contarse como provincia.

## Cobertura territorial

| Jurisdicción | Filas |
| --- | ---: |
| Salta | 9.080 |
| San Juan | 7.269 |
| Córdoba | 6.201 |
| Ciudad Autónoma de Buenos Aires | 5.846 |
| Río Negro | 5.463 |
| San Luis | 5.221 |
| Chaco | 4.903 |
| Mendoza | 4.832 |
| Buenos Aires | 4.417 |
| Santa Cruz | 3.996 |
| La Rioja | 3.747 |
| Santa Fe | 3.450 |
| La Pampa | 3.283 |
| Santiago del Estero | 2.422 |
| Corrientes | 2.023 |
| Tierra del Fuego | 1.987 |
| Catamarca | 1.899 |
| Chubut | 1.871 |
| Misiones | 1.334 |
| Tucumán | 843 |
| Entre Ríos | 786 |
| Neuquén | 389 |
| Jujuy | 307 |
| Formosa | 105 |

## Estados informados por SAIJ

| Estado de origen | Filas |
| --- | ---: |
| Vigente, de alcance general | 36.439 |
| Individual, Solo Modificatoria o Sin Eficacia | 34.334 |
| Derogada | 7.460 |
| No vigente, ley caduca | 2.771 |
| Refundida, ley caduca | 467 |
| No vigente, abrogada implícitamente | 152 |
| Vetada | 51 |

Estos valores se conservan como datos declarados por SAIJ; no constituyen certificación jurídica independiente de vigencia.

## Duplicados candidatos

Se identificaron 285 grupos (1.423 filas) con coincidencia en la clave candidata formada por jurisdicción, tipo, número y fecha. En la inspección de contenido, los registros de esos grupos no son idénticos entre sí. Por lo tanto, son **conflictos/candidatos para revisión**, no duplicados exactos confirmados. No se eliminó ni fusionó ninguna fila.

## Alcance de esta validación

Esta inspección independiente del archivo confirma su legibilidad, estructura, cobertura territorial y métricas descriptivas. **No equivale a ejecutar el importador Node.js del repositorio**, no prueba enlaces individuales ni vigencia jurídica, y no representa una carga en Supabase.

No se escribió ningún registro en Supabase, no se cargó el CSV a la base, no se alteraron expedientes ni documentos y no se publicó ni fusionó el PR. El siguiente paso técnico es ejecutar el importador versionado contra este archivo, revisar el reporte que produzca y resolver la fila incompleta y los 285 grupos candidatos antes de diseñar una carga idempotente y reversible.

## Atribución

Datos publicados por el Ministerio de Justicia, Sistema Argentino de Información Jurídica (SAIJ), bajo la licencia declarada CC BY 4.0.