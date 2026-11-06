# Asistente jurídico por expediente — base de datos y política de privacidad

## Decisión de producto

JurisFlow no conectará por ahora proveedores externos de IA ni enviará expedientes, documentos, mensajes o datos de clientes a servicios de terceros. La IA generativa permanece desactivada. No se crearán claves, no se habilitará facturación y no se contratarán servicios para habilitarla.

La prioridad es proteger el secreto profesional y la confidencialidad de los clientes. Más adelante podrá evaluarse un modelo privado/local, siempre que su operación sea técnicamente segura, sostenible y no implique costos no autorizados. Cualquier futura transferencia externa requerirá una evaluación independiente y autorización expresa.

## Base de datos preparada

- Cada conversación queda vinculada obligatoriamente a un expediente y a un estudio.
- Los mensajes de usuario se guardan con RLS; solo el propio usuario puede insertar mensajes con rol user.
- Los mensajes assistant/system no se pueden insertar desde el navegador: deberán generarse en un servicio de servidor autenticado.
- Citas quedan vinculadas a una conversación, un mensaje y una fuente legal o documento del mismo expediente.
- Las citas a documentos no pueden apuntar a archivos de otro estudio o causa.
- Los fragmentos documentales usan búsqueda de texto completo en español (PostgreSQL FTS). No se instaló una extensión vectorial ni se generaron embeddings.
- El acceso a conversaciones, mensajes, citas y fragmentos hereda los permisos RLS del expediente.

## Criterio de fuentes y calidad jurídica

- La IA futura deberá priorizar fuentes oficiales y registros marcados como verificados manualmente.
- Una cita deberá conservar autoridad, identificador/cita exacta, URL, fecha de revisión y, si proviene de un documento, página.
- La verificación manual no demuestra por sí sola vigencia jurídica: debe comprobarse el texto oficial y sus modificaciones.
- La IA debe distinguir texto de la fuente, resumen, inferencia y aspectos que necesitan revisión profesional.
- Si no encuentra fuente suficiente, debe decirlo; no puede inventar normas, fallos ni enlaces.
- Todo resultado deberá quedar sujeto a revisión del profesional; no reemplaza criterio jurídico ni firma del abogado.

## Opciones externas evaluadas y descartadas por ahora

### Gemini API gratuita

La documentación oficial indica que el nivel gratuito permite determinados modelos y cuotas, pero el contenido enviado y las respuestas pueden usarse para mejorar productos y tecnologías de aprendizaje automático; además, revisores humanos pueden procesar muestras. Google indica expresamente que no se envíen datos sensibles, confidenciales o personales a los servicios no pagos.

Conclusión: no es apropiado para expedientes jurídicos confidenciales en el nivel gratuito.

### GroqCloud

La documentación oficial indica que las solicitudes de inferencia no se retienen por defecto; pueden registrarse temporalmente hasta 30 días para fiabilidad/abuso, y todos los clientes pueden activar Zero Data Retention desde Data Controls. La documentación también indica que los datos se almacenan en buckets de Google Cloud ubicados en Estados Unidos. El plan gratuito tiene límites por modelo y organización, que pueden cambiar y provocar respuestas 429.

Conclusión: aunque ZDR reduce retención, sigue implicando transferencia de datos a infraestructura estadounidense. No se habilita para expedientes reales.

## Búsqueda jurídica sin proveedor externo

La biblioteca global contiene referencias normativas nacionales iniciales y portales oficiales de investigación: SAIJ, Base SAIJ de Normativa Provincial e Infoleg (directorio de portales provinciales y CABA). Los portales son puntos de acceso; la base todavía no importa automáticamente todo su contenido. La función SQL `search_case_materials` busca en fuentes legales marcadas como verificadas y en fragmentos documentales indexados en español. La función exige acceso de lectura al expediente y las consultas a las tablas respetan RLS.

Los PDF y DOCX se extraen localmente en el navegador y se indexan en fragmentos FTS privados del expediente. Los PDF escaneados e imágenes JPG/PNG admiten OCR local con Tesseract.js en español, limitado a 40 páginas escaneadas por PDF. El documento se procesa en el navegador; se descargan los componentes y datos lingüísticos del motor OCR, pero el contenido del expediente no se envía a un proveedor externo.

## Documentación oficial revisada

- Google Gemini API Additional Terms: https://ai.google.dev/gemini-api/terms
- Google Gemini API pricing/data use: https://ai.google.dev/gemini-api/docs/pricing
- Groq Your Data: https://console.groq.com/docs/your-data
- Groq Rate Limits: https://console.groq.com/docs/rate-limits

## Próximos pasos seguros

1. Mantener la integración IA generativa desactivada por defecto.
2. Mantener la extracción local y búsqueda privada de fragmentos; probar OCR local en navegadores y dispositivos de producción.
3. Evaluar un modelo privado/local únicamente cuando exista infraestructura y capacidad de mantenimiento seguras, sin activar costos no autorizados.
4. Si alguna vez se propone un proveedor externo, revisar contrato, retención, entrenamiento, ubicación de datos, obligaciones profesionales y base legal antes de pedir autorización.
5. Mantener claves y secretos exclusivamente en servidor; nunca en variables VITE ni en el navegador.
6. Probar que dos estudios no puedan consultar conversaciones, fragmentos, citas ni documentos entre sí.
7. Exigir citas rastreables y revisión humana antes de usar resultados en presentaciones judiciales.

No se creó ninguna clave de IA, no se envió contenido jurídico a un modelo externo y no se activó ningún servicio pago.
