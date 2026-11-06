# Ingesta de normativa provincial SAIJ

**Estado:** diseño de ingesta documentado; todavía no se importaron registros a Supabase.  
**Fecha de revisión de la fuente:** 5 de noviembre de 2026.

## 1. Fuente primaria

- Dataset: Base SAIJ de Normativa Provincial.
- Organismo responsable: Ministerio de Justicia, Secretaría de Justicia, Dirección Nacional del Sistema Argentino de Información Jurídica.
- Página del dataset: https://datos.jus.gob.ar/dataset/base-saij-de-normativa-provincial
- Recurso CSV: https://datos.jus.gob.ar/dataset/d59c2d29-d561-4ad2-a032-cc82b40db2d3/resource/0ebc70cc-0e71-4158-ab75-9759339e4cbd/download/base-saij-normativa-provincial.csv
- Documentación de campos: https://github.com/datos-justicia-argentina/Base-SAIJ-de-Normativa-Provincial/blob/master/Base-SAIJ-de-Normativa-Provincial-metadata.md
- Formato: CSV UTF-8 delimitado por comas.
- Cobertura temporal declarada: desde 1886 hasta la fecha indicada por el dataset.
- Frecuencia declarada: mensual.
- Licencia publicada: Creative Commons Attribution 4.0 International (CC BY 4.0).
- Última actualización visible al revisar: 2 de noviembre de 2026; datos actualizados al 31 de octubre de 2026.

La fuente contiene metadatos y enlaces a textos normativos. No debe asumirse que cada fila contiene el texto completo de la norma.

## 2. Campos documentados por SAIJ

El CSV documenta estos campos:

| Campo SAIJ | Uso propuesto |
| --- | --- |
| `provincia_nombre` | Jurisdicción territorial de la norma |
| `tipo_norma` | Tipo de acto normativo |
| `numero_norma` | Número oficial o S/N |
| `estado_vigencia` | Estado informado por SAIJ; conservarlo como dato de origen |
| `fecha` | Fecha de sanción/emisión |
| `fecha_publicacion` | Fecha de publicación en el boletín oficial |
| `nombre_norma` | Nombre o nomenclatura |
| `titulo_resumido` | Descripción específica |
| `titulo_sumario` | Descripción general |
| `informacion_digesto` | Información de consolidación/digesto |
| `texto_actualizado` | Enlace al texto actualizado, cuando exista |
| `provincia_id` | Código provincial INDEC; documentado desde agosto de 2018 |

La documentación del proveedor enumera valores heterogéneos para `tipo_norma`. No reducirlos a una lista cerrada ni descartar valores desconocidos.

## 3. Reglas obligatorias de normalización

1. Conservar una copia inmutable del CSV original por cada fecha de descarga, junto con URL, fecha/hora de captura, hash SHA-256, licencia y fecha de actualización declarada por SAIJ.
2. Conservar los campos originales sin sobrescribirlos. Los campos normalizados deben ser adicionales.
3. Normalizar nombres de provincias mediante una tabla de equivalencias controlada; no inferir provincia por el texto del título.
4. Usar `provincia_id` cuando esté presente. En registros anteriores a agosto de 2018, no inventar el código faltante.
5. Mantener por separado fecha de sanción y fecha de publicación.
6. Conservar literalmente `estado_vigencia` como estado informado por la fuente, con fecha de corte. No presentarlo como certificación jurídica propia ni como vigencia comprobada hoy.
7. `texto_actualizado` debe guardarse como URL de origen. No descargar ni republicar automáticamente el texto hasta revisar permisos, condiciones de uso, estabilidad del enlace y procedencia.
8. Registrar duplicados posibles mediante una clave calculada con jurisdicción, tipo, número y fecha, pero no fusionar automáticamente normas con identificadores ambiguos.
9. No convertir registros provinciales en normativa nacional ni asignarles jurisdicción judicial federal.
10. Rechazar filas malformadas para revisión, sin descartar silenciosamente el archivo completo.

## 4. Modelo de publicación en JurisFlow

La primera etapa debe importar un catálogo nacional de metadatos, no marcar todo el contenido como verificado manualmente.

Cada registro importado debe permitir distinguir:
- Organismo/fuente de origen: SAIJ.
- Jurisdicción provincial declarada.
- Identificador de norma, tipo y fechas.
- Estado de vigencia informado por SAIJ y fecha de corte del dataset.
- URL al texto actualizado.
- Fecha de ingesta y hash del lote.
- Estado interno de revisión de JurisFlow.

La marca interna `verified` de la biblioteca actual no debe asignarse automáticamente por el solo hecho de que el registro provenga de SAIJ. La interfaz debe mostrar explícitamente que el estado de vigencia es el informado por SAIJ y que requiere comprobar el texto oficial y las modificaciones posteriores antes de usarlo en una presentación.

Antes de agregar columnas o tablas a Supabase, revisar el esquema real de `legal_library` y sus políticas RLS. No ejecutar migraciones destructivas ni modificar datos existentes.

## 5. Controles de calidad antes de importar

- Confirmar que el CSV descargado coincide con la documentación de campos y la codificación UTF-8.
- Verificar que el número de columnas sea consistente en todas las filas.
- Validar fechas y códigos INDEC sin descartar valores históricos legítimos.
- Informar cantidad total de filas, provincias representadas, filas sin código provincial, estados de vigencia y enlaces vacíos.
- Detectar duplicados exactos y probables.
- Verificar una muestra de enlaces contra la publicación oficial.
- Importar primero a un entorno de prueba o en modo de simulación; no escribir en producción sin revisión.
- Hacer la importación idempotente: repetir el mismo lote no debe duplicar registros.
- Mantener registro del lote y permitir revertir exclusivamente ese lote.

## 6. Límites de alcance

Esta fuente es una base inicial de normativa provincial. No reemplaza:
- Boletines oficiales provinciales para verificar publicación auténtica.
- Digestos oficiales y textos ordenados para revisar modificaciones y vigencia.
- Poderes judiciales provinciales para jurisprudencia.
- SAIJ/Infoleg y fuentes oficiales nacionales para normativa nacional.
- Revisión profesional de la norma aplicable al caso.

La cobertura de un dataset no equivale a cobertura completa del derecho vigente de cada provincia. JurisFlow debe mostrar qué jurisdicciones y períodos están efectivamente representados y la fecha de corte de cada lote.

## 7. Próximo paso técnico

Construir un importador reproducible que:
1. descargue el CSV desde el recurso oficial;
2. calcule y registre su hash;
3. valide encabezados y filas;
4. produzca un informe de calidad sin escribir en la base;
5. genere un archivo normalizado de revisión;
6. permita luego una carga idempotente con controles RLS y auditoría.

No se deben cargar expedientes, clientes ni documentos privados durante este proceso.


## 8. Importador disponible en el repositorio

Se agregó `scripts/import-saij-provincial.mjs`, sin dependencias adicionales, y pruebas automatizadas en `tests/importSaijProvincial.test.js`.

### Ejecución de simulación

Descargar el CSV desde el recurso oficial y ejecutar:

```bash
npm test
npm run import:saij:provincial -- ./base-saij-normativa-provincial.csv --updated-through 2026-10-31
```

También se puede omitir el archivo local para que Node.js intente descargar el recurso oficial:

```bash
npm run import:saij:provincial -- --updated-through 2026-10-31
```

El importador genera `artifacts/saij-provincial/report.json` y `records.jsonl`. Calcula SHA-256, conserva cada fila original, normaliza jurisdicción y fechas, identifica duplicados candidatos y deja toda fuente con verificación interna pendiente. Si hay filas defectuosas, genera el informe y termina con código 2 para impedir que se interprete como un lote limpio.

**Importante:** el importador actual es deliberadamente de solo lectura respecto de Supabase. No inserta ni actualiza filas de la biblioteca. La integración de persistencia requiere primero una migración revisada, claves idempotentes, permisos RLS para catálogo global y una estrategia de rollback por lote. Tampoco descarga automáticamente el texto enlazado de cada norma.
