# Validación del catálogo compacto

Este marcador habilita una ejecución integral del corpus después de reducir la salida por defecto: sin resúmenes extensos y sin exportar observaciones duplicadas de relaciones. El workflow valida conteos, procedencia, simetría, resolución de IDs y manifiesto versión 2. La carga a Supabase continúa deshabilitada.

Solicitud de validación integral reproducible: [run-corpus-validation]. La salida compacta se debe medir antes de cualquier decisión de carga.

Esquema compacto v3: los metadatos de archivo/captura se conservan por lote; las normas guardan código de fuente, fila y hash binario en la futura tabla. La validación de salida no autoriza importación automática a Supabase.
