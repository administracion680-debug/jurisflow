# Fuentes oficiales de jurisprudencia argentina

**Objetivo:** ofrecer acceso trazable a fuentes oficiales, sin presentar un directorio de enlaces como si fuera una base de fallos descargada o completa.

## Fuentes nacionales

| Fuente | Cobertura publicada | Acceso |
| --- | --- | --- |
| Secretaría de Jurisprudencia de la Corte Suprema de Justicia de la Nación | Sumarios desde 1863 y fallos completos desde 1994, según el portal institucional | https://sj.csjn.gov.ar/homeSJ/ |
| Centro de Información Judicial | Sentencias, acordadas y resoluciones administrativas de la CSJN, cámaras de apelaciones y tribunales orales según la información institucional | https://www.cij.gov.ar/sentencias.html |
| SAIJ | Servicio de consulta de legislación y jurisprudencia de alcance nacional y provincial | https://www.saij.gob.ar/ |

## Cobertura provincial y CABA

El directorio institucional de Justicia.ar reúne enlaces de consulta de sentencias para la CSJN, Poder Judicial de la Nación, las 23 provincias y Ciudad Autónoma de Buenos Aires:

https://tramites.csjn.gov.ar/herramientas/sentencias

JurisFlow enlaza a este directorio como punto de entrada. No se deben inventar URLs de APIs ni automatizar extracción masiva de portales provinciales sin comprobar sus condiciones técnicas y jurídicas.

## Estado de la ingesta

- La consulta web de jurisprudencia no equivale a un dataset abierto descargable.
- No se identificó en el catálogo abierto consultado un archivo nacional único y descargable que contenga toda la jurisprudencia provincial y nacional.
- El buscador SAIJ y los portales de los poderes judiciales se tratan como fuentes de consulta; el fallo debe enlazarse a su publicación oficial.
- Los fallos incorporados manualmente en JurisFlow deben registrar tribunal, sala, carátula, expediente, fecha, jurisdicción, URL oficial y cita.
- La verificación se mantiene manual y fechada. Un enlace encontrado no certifica autenticidad, integridad ni vigencia de la doctrina.
- No se ejecuta scraping ni se descargan lotes masivos de sentencias en esta etapa.

## Próxima etapa técnica

Para cada jurisdicción, evaluar por separado si el poder judicial ofrece un catálogo estructurado, API o descarga autorizada. Registrar método, cobertura, fecha de última actualización, licencia/condiciones y limitaciones. Si solo existe un buscador web, mantener el enlace y la búsqueda asistida sin copiar el corpus.

## Fuentes institucionales revisadas

- Justicia.ar, directorio de sentencias por jurisdicción: https://tramites.csjn.gov.ar/herramientas/sentencias
- Secretaría de Jurisprudencia CSJN: https://sj.csjn.gov.ar/homeSJ/
- CIJ, búsqueda de sentencias, acordadas y resoluciones: https://www.cij.gov.ar/nota-33142-B-squeda-de-sentencias--acordadas-y-resoluciones-.html
- SAIJ: https://www.saij.gob.ar/
