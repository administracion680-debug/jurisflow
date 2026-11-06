# Ingesta de bases complementarias Infoleg

## Recursos de entrada

Este proceso recibe los dos ZIP completos publicados por Infoleg:
- Base Complementaria de Normas Modificatorias.
- Base Complementaria de Normas Modificadas.

También requiere el ZIP de la Base Infoleg de Normativa Nacional para comprobar que los identificadores de ambos extremos de cada relación existan en el catálogo nacional.

Fuente: https://datos.jus.gob.ar/es_AR/dataset/base-de-datos-legislativos-infoleg
Licencia informada por el organismo: CC BY 4.0. Conservar atribución y metadatos de procedencia.

## Ejecución

```bash
npm run import:infoleg:complementary -- \
  --national-zip ./base-infoleg-normativa-nacional.zip \
  ./base-complementaria-infoleg-normas-modificatorias.zip \
  ./base-complementaria-infoleg-normas-modificadas.zip \
  --out ./artifacts/infoleg-complementary
```

El importador:
- Identifica el CSV por sus encabezados oficiales, sin asumir la ruta interna del ZIP.
- Conserva los ZIP y CSV originales y calcula SHA-256 de los ZIP complementarios.
- Normaliza ambos recursos a la misma relación dirigida: `modifying_norm_id` modifica a `modified_norm_id`.
- Compara los conjuntos de relaciones de ambas bases.
- Comprueba que los identificadores de las relaciones existan en la base nacional.
- Marca las relaciones como pendientes de verificación y conserva cada fila fuente.
- Genera `relations.jsonl` con cada fila fuente normalizada de ambos ZIP, conservando procedencia, número de fila, datos originales y candidatos duplicados.
- Genera `relations-canonical.jsonl` con una sola representación por relación dirigida, para análisis posterior; no reemplaza el registro de filas fuente.
- Genera `report.json` con errores, duplicados, simetría y referencias ausentes.

## Validaciones observadas en los archivos recibidos

En la revisión de los tres ZIP recibidos se encontraron:
- Base nacional: 430.834 filas, 426.144 identificadores únicos.
- Normas modificatorias: 380.481 filas.
- Normas modificadas: 385.118 filas.
- Ambas bases complementarias representan 377.106 relaciones únicas coincidentes.
- En esta revisión, todos los identificadores de las relaciones estuvieron presentes en el catálogo nacional.

Estas cifras describen los archivos revisados, no garantizan que futuras versiones mantengan los mismos valores. Los duplicados no se eliminan del material original: se informan y se conserva la fila fuente.

## Límites y seguridad

Este importador solo genera artefactos locales. No escribe en Supabase, no modifica la biblioteca de producción y no verifica por sí mismo la vigencia o validez jurídica de una norma. La carga en la base requiere una migración idempotente, revisión de esquema/RLS, pruebas y autorización separada.
