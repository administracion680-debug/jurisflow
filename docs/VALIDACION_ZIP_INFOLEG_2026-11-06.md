# Informe de validación de los ZIP completos de Infoleg

**Fecha de revisión:** 6 de noviembre de 2026  
**Fuentes:** Ministerio de Justicia / Dirección Nacional del Sistema Argentino de Información Jurídica  
**Licencia informada:** Creative Commons Attribution 4.0 International (CC BY 4.0)  
**Dataset oficial:** https://datos.jus.gob.ar/es_AR/dataset/base-de-datos-legislativos-infoleg

## Resultado de integridad y estructura

Los tres archivos ZIP adjuntos fueron abiertos con un lector ZIP y sus CSV internos se recorrieron con un lector CSV compatible con campos entrecomillados. Cada ZIP contiene un único CSV.

| Archivo ZIP | CSV interno | Filas de datos | Columnas |
| --- | --- | ---: | ---: |
| `base-infoleg-normativa-nacional.zip` | `base-infoleg-normativa-nacional.csv` | 430.834 | 17 |
| `base-complementaria-infoleg-normas-modificatorias.zip` | `base-complementaria-infoleg-normas-modificatorias.csv` | 380.481 | 9 |
| `base-complementaria-infoleg-normas-modificadas.zip` | `base-complementaria-infoleg-normas-modificadas.csv` | 385.118 | 9 |

## Identificadores y relaciones

- Normativa nacional: 430.834 filas y 426.144 identificadores `id_norma` únicos; 4.690 filas adicionales repiten un identificador.
- Normas modificatorias: 380.481 filas y 377.106 relaciones únicas; 3.375 filas duplican una relación.
- Normas modificadas: 385.118 filas y 377.106 relaciones únicas; 8.012 filas duplican una relación.
- Las dos bases complementarias representan exactamente el mismo conjunto de 377.106 pares dirigidos (norma modificatoria, norma modificada).
- Todos los identificadores de ambos extremos de esas relaciones están presentes en el catálogo nacional de 426.144 identificadores únicos.

Los duplicados se informan y no se eliminan de los archivos originales. La igualdad de relaciones entre ambos recursos complementarios permite usar una sola representación normalizada de cada relación, conservando por separado ambas filas fuente y su procedencia.

## SHA-256 de los ZIP revisados

| Archivo | SHA-256 |
| --- | --- |
| `base-infoleg-normativa-nacional.zip` | `2573e59f0c5aadee93131a5634f4fbe0391ccb018aef3392af34c58f64b34666` |
| `base-complementaria-infoleg-normas-modificatorias.zip` | `1e7c62b7a90a654c88012996e23ec83e10e0f3bf81fb3e61d9d5e00bddfa3f35` |
| `base-complementaria-infoleg-normas-modificadas.zip` | `041e56a5614220584576c18d8873b747cca6735ee617c1ac763e28d5ccf7799d` |

## Alcance y limitaciones

Esta revisión confirma que los ZIP se pueden abrir, que sus CSV tienen estructura legible, y que los identificadores y relaciones cumplen los controles descriptos. No equivale a ejecutar los importadores Node.js del repositorio, ni a validar jurídicamente cada norma, su vigencia actual o el texto publicado.

No se realizó ninguna escritura en Supabase, no se cargaron registros en la biblioteca de producción y no se modificaron expedientes ni documentos privados. La importación definitiva requiere ejecutar los importadores del repositorio, revisar sus reportes, preparar una carga idempotente y reversible, verificar el esquema/RLS real y realizar pruebas en un entorno controlado.

## Atribución

Datos publicados por el Ministerio de Justicia, Secretaría de Justicia, Dirección Nacional del Sistema Argentino de Información Jurídica. Licencia declarada por el catálogo: Creative Commons Attribution 4.0 International (CC BY 4.0). Fuente: https://datos.jus.gob.ar/es_AR/dataset/base-de-datos-legislativos-infoleg
