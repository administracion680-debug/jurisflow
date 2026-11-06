# Diseño de catálogo legislativo global para JurisFlow

**Estado:** propuesta técnica; no aplicada a Supabase.  
**Fecha:** 6 de noviembre de 2026.

## 1. Por qué no se debe reutilizar `legal_library`

La tabla existente `public.legal_library` contiene referencias generales o de cada estudio y actualmente dispone de columnas como título, tipo, jurisdicción, cita, URL, resumen y estado de verificación. No representa adecuadamente:
- cientos de miles de normas con identificadores de origen no únicos;
- filas originales repetidas con metadatos distintos;
- relaciones dirigidas entre normas modificatorias y modificadas;
- lotes de importación, hashes y archivos fuente;
- la diferencia entre vigencia informada por el organismo y verificación profesional.

El catálogo legislativo nacional debe ser un conjunto global independiente. No debe mezclarse con documentos de clientes ni con fuentes privadas de un estudio.

## 2. Datos de Infoleg comprobados

Los tres ZIP completos recibidos se validaron de forma independiente. Ver `VALIDACION_ZIP_INFOLEG_2026-11-06.md`.

Una observación decisiva: la base nacional tiene 430.834 filas y 426.144 IDs distintos. De las 4.690 filas que repiten un ID, solo una es idéntica a una fila anterior; las otras 4.689 contienen diferencias de metadatos (por ejemplo, distintos organismos de origen o números en actos conjuntos). Por tanto:
- `id_norma` no debe ser una clave única de fila.
- No se deben fusionar ni descartar filas repetidas automáticamente.
- Cada fila debe conservar un identificador de fila de fuente (lote + número de fila) y su hash.
- La búsqueda debe agrupar por ID de norma y advertir si existen variantes de fuente.

Las dos bases complementarias contienen 377.106 relaciones únicas coincidentes; todos los IDs de ambos extremos aparecen en el catálogo nacional. Los duplicados de las fuentes se conservan en los ZIP originales y se resumen en los reportes.

## 3. Modelo propuesto

### `legal_import_batches`
Registro inmutable de cada lote:
- identificador UUID;
- organismo, dataset, URL de origen y licencia;
- fecha de corte declarada por el organismo y fecha/hora de captura;
- SHA-256 del ZIP y del CSV;
- ruta privada del ZIP original en Storage;
- cantidad de filas, filas válidas, duplicados, errores y estado del lote;
- usuario/operación que autorizó la carga, cuando corresponda.

Estados propuestos: `received`, `validated`, `staged`, `published`, `rolled_back`, `rejected`.

### `legal_norms`
Una fila por fila fuente, no una fila por ID de norma:
- `batch_id`, `source_row_number`, `source_id`, `source_row_hash`;
- tipo, número, clase y organismo;
- fecha de sanción, fecha de Boletín Oficial, número y página;
- título resumido, título de sumario, texto resumido y observaciones;
- URL original y URL actualizada, sin reescribir los enlaces de origen;
- estado informado por la fuente y fecha de corte;
- jurisdicción: nacional, provincial o Ciudad Autónoma de Buenos Aires;
- estado de revisión interno, inicialmente `pending`.

Restricción única propuesta: `(batch_id, source_row_number)`. No imponer unicidad a `source_id`.

### `legal_norm_relations`
Una fila por relación dirigida única y lote:
- `batch_id`;
- `modifying_norm_id`;
- `modified_norm_id`;
- cantidad de apariciones en cada recurso complementario;
- verificación estructural de que ambos IDs existen en el catálogo nacional;
- estado de revisión jurídica, inicialmente `pending`.

La relación estructural no certifica que una norma esté vigente, ni que la modificación esté consolidada correctamente.

## 4. Seguridad y acceso

- Las tablas son globales y de solo lectura para usuarios autenticados.
- No tienen `firm_id`: el catálogo oficial no pertenece a un estudio.
- Los usuarios no pueden insertar, actualizar ni borrar registros globales desde el cliente.
- Las cargas se ejecutarán por un proceso administrativo controlado, nunca con `service_role` en el navegador.
- RLS debe estar habilitado y probado en todas las tablas nuevas.
- No se guardan expedientes, documentos, mensajes ni datos de clientes en estas tablas.
- Los archivos ZIP originales se guardarían en un bucket privado, con lectura administrativa; la interfaz pública autenticada consultaría los metadatos del catálogo, no los ZIP completos.

## 5. Restricciones del plan gratuito

Según la documentación oficial consultada el 6/11/2026, Supabase Free incluye 500 MB de base de datos por proyecto, 1 GB de Storage, 5 GB de egress y un límite de 50 MB por archivo. La base nacional descomprimida ocupa aproximadamente 258 MB en CSV, por lo que no se debe guardar el CSV completo como texto dentro de Postgres ni duplicar los registros fuente completos en JSONB. Los tres ZIP comprimidos recibidos ocupan aproximadamente 69 MB en conjunto.

La implementación debe:
1. guardar los ZIP originales comprimidos en Storage privado si el límite efectivo del proyecto lo permite;
2. almacenar en Postgres solo las columnas necesarias para búsqueda y trazabilidad, sin duplicar el CSV completo en JSONB;
3. medir tamaño real de tablas e índices después de una carga piloto pequeña;
4. reservar espacio para el resto de la aplicación y el WAL;
5. dividir cargas en lotes pequeños y medir el crecimiento;
6. detener la carga si la proyección excede el límite gratuito o compromete el funcionamiento.

No se debe activar un plan pago, aumentar cuotas ni aceptar cargos para completar esta etapa.

## 6. Estrategia de importación y reversión

1. Validar los tres ZIP y el CSV SAIJ con los importadores versionados.
2. Crear un lote en estado `validated` sin publicar registros.
3. Ejecutar una prueba piloto pequeña en tablas de staging.
4. Medir tamaño, tiempo de carga, consultas e índices.
5. Revisar duplicados conflictivos y cobertura de jurisdicciones.
6. Publicar por lotes idempotentes con clave `(batch_id, source_row_number)`.
7. Verificar conteos, relaciones, búsqueda, RLS y consumo de cuota.
8. Marcar el lote `published` solo tras las pruebas.
9. Permitir rollback eliminando únicamente las filas del lote correspondiente y conservando el archivo fuente y el informe.

No aplicar DDL ni cargar datos hasta revisar las migraciones reales, las políticas RLS, el baseline histórico y el espacio disponible del proyecto.

## 7. Límites jurídicos

- La licencia CC BY 4.0 exige atribución de la fuente.
- La fecha de corte y el estado de vigencia se presentan como información declarada por Infoleg/SAIJ.
- Las filas no se marcan como jurídicamente verificadas automáticamente.
- Los enlaces de origen se conservan literalmente; si son HTTP, se advierte que el enlace original no usa HTTPS en vez de reescribirlo sin comprobarlo.
- La jurisprudencia sigue siendo una fuente separada y requiere enlaces oficiales verificables por jurisdicción.
