# Ingesta de normativa nacional Infoleg

**Estado:** importador reproducible preparado; no se han importado registros en Supabase.
**Fuente:** Ministerio de Justicia, Dirección Nacional del Sistema Argentino de Información Jurídica.
**Dataset:** https://datos.jus.gob.ar/dataset/base-de-datos-legislativos-infoleg
**Licencia publicada:** CC BY 4.0.

## Alcance y límites

La base Infoleg nacional contiene metadatos de leyes, decretos, decisiones administrativas, resoluciones, disposiciones, acordadas y otros actos publicados en la primera sección del Boletín Oficial desde mayo de 1997, además de normativa referenciada. La fuente informa actualización mensual del catálogo de datos y actualización diaria del servicio de consulta en Infoleg. La fecha de corte debe registrarse por lote y no confundirse con la fecha de captura.

El ZIP completo es la fuente de ingesta. El CSV de muestra de 1.000 filas no se considera cobertura completa y no debe usarse para publicar un catálogo completo. Los textos originales y actualizados son enlaces de origen; el importador no descarga ni republica esos textos.

## Campos conservados

Se conservan todos los campos originales documentados: `id_norma`, `tipo_norma`, `numero_norma`, `clase_norma`, `organismo_origen`, `fecha_sancion`, `numero_boletin`, `fecha_boletin`, `pagina_boletin`, `titulo_resumido`, `titulo_sumario`, `texto_resumido`, `observaciones`, `texto_original`, `texto_actualizado`, `modificada_por` y `modifica_a`.

El ID de origen se utiliza como clave de deduplicación nacional. Se mantienen separados los enlaces al texto original y al actualizado. No se infiere una certificación de vigencia a partir de estos metadatos.

## Ejecución local

1. Descargar el recurso ZIP completo desde el portal oficial del dataset.
2. Ejecutar:

```bash
npm test
npm run import:infoleg:national -- ./base-infoleg-normativa-nacional.zip --updated-through AAAA-MM-DD
```

La herramienta detecta el CSV dentro del ZIP por sus encabezados, sin asumir el nombre o ruta interna. Genera `source-original.zip`, `source-original.csv`, `report.json` y `records.jsonl` en `artifacts/infoleg-national/`, junto con el SHA-256 del ZIP.

## Seguridad

- No inserta ni actualiza datos en Supabase.
- No marca normas como verificadas.
- No trata la muestra de 1.000 filas como base completa.
- Los errores de filas quedan en el informe; el proceso termina con código 2 si los hay.
- La persistencia futura requiere revisar el esquema y las políticas RLS reales, diseñar importación idempotente y rollback por lote.
