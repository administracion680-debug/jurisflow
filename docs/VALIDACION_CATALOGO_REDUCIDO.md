# Validación del catálogo compacto

Este marcador habilita una ejecución integral del corpus después de reducir la salida por defecto: sin resúmenes extensos y sin exportar observaciones duplicadas de relaciones. El workflow valida conteos, procedencia, simetría, resolución de IDs y manifiesto versión 2. La carga a Supabase continúa deshabilitada.

Solicitud de validación integral reproducible: [run-corpus-validation]. La salida compacta se debe medir antes de cualquier decisión de carga.

Esquema compacto v3: los metadatos de archivo/captura se conservan por lote; las normas guardan código de fuente, fila y hash binario en la futura tabla. La validación de salida no autoriza importación automática a Supabase.

La validación v3 también debe cargar el esquema y el catálogo completo en un PostgreSQL 17 efímero, crear los índices previstos y medir heap/índices sin modificar Supabase.

Optimización de huella v4: claves primarias compuestas basadas en lote/fila y relación origen/destino/tipo; índices redundantes de lote/deduplicación eliminados y lookup Infoleg con índice parcial.

La prueba PostgreSQL v4 debe comprobar lectura autenticada del corpus, bloqueo de lectura anónima, bloqueo de escritura del cliente y acceso de service_role al esquema privado.
