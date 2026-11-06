# Asistente jurídico por expediente — base de datos y decisión de proveedor

## Base de datos preparada

- Cada conversación queda vinculada obligatoriamente a un expediente y a un estudio.
- Los mensajes de usuario se guardan con RLS; solo el propio usuario puede insertar mensajes con rol user.
- Los mensajes assistant/system no se pueden insertar desde el navegador: deberán generarse en un servicio de servidor autenticado.
- Citas quedan vinculadas a una conversación, un mensaje y una fuente legal o documento del mismo expediente.
- Las citas a documentos no pueden apuntar a archivos de otro estudio o causa.
- Los fragmentos documentales usan búsqueda de texto completo en español (PostgreSQL FTS). No se instaló una extensión vectorial ni se generaron embeddings.
- El acceso a conversaciones, mensajes, citas y fragmentos hereda los permisos RLS del expediente.

## Criterio de fuentes

- La IA deberá priorizar fuentes oficiales y registros marcados como verificados manualmente.
- Una cita deberá conservar autoridad, identificador/cita exacta, URL, fecha de revisión y, si proviene de un documento, página.
- La verificación manual no demuestra por sí sola vigencia jurídica: debe comprobarse el texto oficial y sus modificaciones.
- La IA debe distinguir texto de la fuente, resumen, inferencia y aspectos que necesitan revisión profesional.
- Si no encuentra fuente suficiente, debe decirlo; no puede inventar normas, fallos ni enlaces.

## Evaluación de opciones gratuitas

### Gemini API gratuita

La documentación oficial indica que el nivel gratuito permite determinados modelos y cuotas, pero el contenido enviado y las respuestas pueden usarse para mejorar productos y tecnologías de aprendizaje automático; además, revisores humanos pueden procesar muestras. Google indica expresamente que no se envíen datos sensibles, confidenciales o personales a los servicios no pagos.

Conclusión: **no es apropiado para expedientes jurídicos confidenciales en el nivel gratuito**.

### GroqCloud

La documentación oficial indica que las solicitudes de inferencia no se retienen por defecto; pueden registrarse temporalmente hasta 30 días para fiabilidad/abuso, y todos los clientes pueden activar Zero Data Retention desde Data Controls. Con ZDR activo, Groq afirma que no retiene datos de clientes para fiabilidad/abuso. La documentación también indica que los datos se almacenan en buckets de Google Cloud ubicados en Estados Unidos. El plan gratuito tiene límites por modelo y organización, que pueden cambiar y provocar respuestas 429.

Conclusión: es un candidato técnico más razonable que Gemini gratuito si se habilita ZDR, pero sigue implicando transferencia de datos a Estados Unidos. No debe recibir expedientes reales hasta revisar el DPA aplicable al modelo elegido, condiciones de servicio, ubicación de datos, obligaciones profesionales y base legal de la transferencia. La cuota gratuita es limitada y no garantiza disponibilidad permanente.

## Búsqueda jurídica sin proveedor externo

Se implementó la función SQL `search_case_materials`, que busca en fuentes legales marcadas como verificadas y en fragmentos documentales indexados en español. La función exige acceso de lectura al expediente y las consultas a las tablas respetan RLS. La interfaz Investigación ya permite consultar estas fuentes. Los documentos cargados aún necesitan un proceso de extracción/indexación para que sus textos aparezcan en los resultados.

## Documentación oficial revisada

- Google Gemini API Additional Terms: https://ai.google.dev/gemini-api/terms
- Google Gemini API pricing/data use: https://ai.google.dev/gemini-api/docs/pricing
- Groq Your Data: https://console.groq.com/docs/your-data
- Groq Rate Limits: https://console.groq.com/docs/rate-limits

## Próximo paso seguro

1. Mantener la integración IA desactivada por defecto.
2. Implementar extracción de texto y búsqueda privada de fragmentos en documentos del expediente.
3. Elegir proveedor solo después de una evaluación de privacidad y autorización explícita.
4. Guardar la clave del proveedor exclusivamente como secreto del servidor; nunca en variables VITE ni en el navegador.
5. Probar que dos estudios no puedan consultar conversaciones, fragmentos, citas ni documentos entre sí.
6. Exigir citas rastreables y revisión humana antes de usar resultados en presentaciones judiciales.

No se creó ninguna clave de IA, no se envió contenido jurídico a un modelo externo y no se activó ningún servicio pago.
