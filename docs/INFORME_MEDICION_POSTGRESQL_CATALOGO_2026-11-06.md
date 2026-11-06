# Informe de medición del catálogo jurídico en PostgreSQL 17

Fecha: 6 de noviembre de 2026
Rama: `architecture/national-foundation`
Commit validado: `a9ba3272d7387eaa8e84c2019c85640ec7157032`
Workflow integral: `42263728893` — `success`
CI: `42263736718` — `success`

## Corpus validado

| Fuente | Filas de entrada | Filas válidas | Observaciones |
|---|---:|---:|---|
| SAIJ provincial | 81.674 | 81.673 | 23 provincias + CABA; 1 fila incompleta preservada en el informe de errores |
| Infoleg nacional | 430.834 | 429.059 | 1.775 filas con errores; 4.509 grupos con ID repetido |
| Infoleg modificatorias | 380.481 | 380.481 | 377.106 relaciones únicas; 3.375 duplicados |
| Infoleg modificadas | 385.118 | 385.118 | 377.106 relaciones únicas; 8.012 duplicados |

Las dos fuentes complementarias describen exactamente las mismas 377.106 relaciones canónicas; no hay IDs ausentes del catálogo nacional y la relación es simétrica. El catálogo contiene 510.732 normas válidas.

## Huella física medida

La prueba cargó las 510.732 normas y 377.106 relaciones en un PostgreSQL 17.11 efímero, creó el esquema y los índices propuestos, ejecutó `ANALYZE` y midió el tamaño físico. No modificó el proyecto Supabase remoto.

| Objeto | Filas | Heap (bytes) | Índices (bytes) | Total (bytes) |
|---|---:|---:|---:|---:|
| `public.legal_norms` | 510.732 | 180.133.888 | 64.274.432 | 244.482.048 |
| `public.legal_norm_relationships` | 377.106 | 41.009.152 | 31.449.088 | 72.507.392 |
| `private.legal_import_batches` | 4 | — | — | 65.536 |
| **Catálogo total** | | | | **317.054.976 bytes (302,37 MiB)** |

Base Supabase de desarrollo medida antes de importar: 13.522.611 bytes (12,90 MiB). Estimación total tras la carga: 330.577.587 bytes (315,26 MiB).

Presupuesto preventivo fijado: 350 MiB (367.001.600 bytes). Margen estimado: 36.424.013 bytes (34,74 MiB). La estimación queda dentro del presupuesto preventivo y debajo de la cuota Free de 500 MB de base de datos, pero el resultado sigue siendo una medición en PostgreSQL temporal, no una importación real en Supabase.

### Índices medidos

| Tabla | Índice | Bytes |
|---|---|---:|
| Normas | `legal_norms_pkey` | 35.733.504 |
| Normas | `legal_norms_source_id_idx` | 9.650.176 |
| Normas | `legal_norms_jurisdiction_type_date_idx` | 6.119.424 |
| Normas | `legal_norms_search_idx` | 12.771.328 |
| Relaciones | `legal_norm_relationships_pkey` | 26.886.144 |
| Relaciones | `legal_norm_relationships_modified_id_idx` | 4.562.944 |

Se eliminaron índices redundantes: el índice separado por `batch_id` queda cubierto por la clave primaria compuesta de normas; el índice de deduplicación no es necesario para el acceso de lectura inicial. Los IDs de origen se buscan con un índice parcial para Infoleg. Las claves primarias compuestas evitan UUIDs y un índice adicional innecesarios.

## Procedencia y seguridad

- Los lotes guardan SHA-256 de cada archivo, fuente, licencia y fecha de captura.
- Cada norma conserva número de fila y SHA-256 de fila; el hash se almacena como `bytea` de 32 bytes.
- Las claves de procedencia se derivan del lote y número de fila.
- Las observaciones complementarias duplicadas no se cargan; se conserva `observation_count` en cada relación canónica.
- Las tablas usan RLS; lectura del corpus global solo para usuarios autenticados; escritura reservada a `service_role`.
- Las propuestas SQL siguen sin aplicarse en Supabase. No se importaron datos ni se ejecutó una migración nueva.

## Pendientes para la carga real

1. Generar la migración del esquema mediante Supabase CLI, revisarla y verificar el diff contra la rama.
2. Preparar un mecanismo de carga por lotes que no exponga claves `service_role` ni contraseñas, que sea idempotente y tenga rollback por lote.
3. Aplicar primero en un entorno de prueba autorizado, medir `pg_database_size` en Supabase y detener si supera 350 MiB.
4. Ejecutar pruebas reales de RLS, Storage, Auth, eliminación y restauración con sesiones de prueba.
5. Revisar privacidad, secreto profesional, residencia de datos y transferencias internacionales antes de producción.

El proyecto Supabase actual está en `us-west-2` (Estados Unidos). No se cambió la región, no se activaron servicios pagos y no se desplegó a producción.

## Artefacto reproducible

- Workflow: `42263728893`
- Artefacto: `13527285024`
- SHA-256 del artefacto: `3ee3a370d141b5fca8534ed376d01d749ae84b0975cc21f0c15ad90841d16d2f`
- Retención del artefacto: hasta el 20 de noviembre de 2026.
