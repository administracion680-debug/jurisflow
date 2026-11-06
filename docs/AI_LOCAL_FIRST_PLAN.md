# Asistente jurídico IA: arquitectura local y sin servicios pagos

Fecha: 6 de noviembre de 2026.

## Estado real

La base tiene tablas preparadas para conversaciones por expediente:
- `ai_conversations`: cada conversación pertenece a un expediente y hereda sus permisos.
- `ai_messages`: permite insertar mensajes del usuario desde el cliente; los mensajes del asistente quedan reservados al proceso servidor.
- `ai_citations`: lectura con acceso al expediente; las citas se crean del lado servidor.
- `document_chunks`: fragmentos indexados con búsqueda textual en español y RLS por expediente.

La función `public.search_case_materials` es `SECURITY INVOKER`, exige sesión y comprueba `private.has_case_access`. Busca fragmentos documentales del expediente y fuentes de `legal_library` marcadas como verificadas. Todavía no consulta el catálogo nacional masivo porque ese catálogo no fue creado ni importado.

**No existe todavía un chat IA funcional ni un proveedor/modelo conectado.** La pantalla actual de Investigación es búsqueda textual con fuentes; no genera análisis ni opiniones jurídicas.

## Propuesta compatible con el requisito de no pagar

Usar un modelo abierto que se ejecute en el navegador del abogado (WebGPU, con alternativa de búsqueda sin IA). Los documentos y extractos se recuperan desde Supabase bajo RLS, pero el modelo procesa el contexto en el propio dispositivo. No se envían expedientes a una API externa.

Flujo propuesto:
1. El abogado abre una conversación dentro de un expediente al que tiene acceso.
2. JurisFlow recupera fragmentos del expediente y fuentes jurídicas verificadas mediante una función con control de acceso.
3. El navegador prepara el contexto y ejecuta el modelo local.
4. La respuesta se presenta con referencias vinculadas exclusivamente a los resultados recuperados. La interfaz no debe inventar citas ni marcar una fuente como verificada si no lo está.
5. Un endpoint servidor valida el usuario, el expediente, las referencias y guarda el mensaje del asistente y las citas. Esto respeta las políticas actuales, que no permiten que el cliente inserte mensajes `assistant` ni filas de `ai_citations`.
6. Si el dispositivo no soporta el modelo, la aplicación conserva el modo de búsqueda documental y jurídica; no simula una respuesta de IA.

## Privacidad y límites

- No incluir claves de proveedor ni `service_role` en el navegador.
- No enviar expedientes, documentos, prompts ni respuestas a proveedores externos.
- No habilitar APIs pagas, suscripciones ni infraestructura de inferencia paga.
- Descargar pesos del modelo solo después de que el usuario lo acepte; el tamaño puede ser de cientos de MB o más de 1 GB según el modelo y la cuantización.
- WebGPU, memoria y rendimiento varían entre teléfonos Android. No se puede prometer que todos los dispositivos ejecuten el mismo modelo.
- El modelo puede equivocarse o inventar razonamientos. Toda respuesta debe identificarse como apoyo, no dictamen ni asesoramiento definitivo; el abogado debe revisar las fuentes originales.
- No se selecciona un modelo hasta verificar licencia comercial, compatibilidad WebLLM/WebGPU y rendimiento real en dispositivos Android modestos.

## Trabajo pendiente para implementarlo

1. Evaluar un modelo pequeño con licencia permisiva y publicar el tamaño real de descarga y requisitos mínimos.
2. Crear un proveedor local aislado y con carga diferida; no incluir los pesos en el bundle inicial.
3. Crear el chat por expediente y el flujo de conversaciones persistidas.
4. Crear un endpoint seguro para guardar respuestas y citas del asistente, validando acceso al expediente y que cada cita pertenezca a resultados recuperados.
5. Ampliar la búsqueda para consultar `public.legal_norms` y `public.legal_norm_relationships` después de crear/importar el catálogo nacional.
6. Probar aislamiento entre dos estudios, citas falsas, prompts maliciosos dentro de documentos y dispositivos sin WebGPU.
7. Mantener un modo de búsqueda sin IA para dispositivos no compatibles.

## Criterio de finalización

No declarar terminada la IA hasta que un abogado pueda conversar sobre una causa, recibir una respuesta generada realmente por el modelo local, abrir cada cita hasta su fuente, comprobar que no se filtró información entre estudios y usar el sistema sin activar servicios pagos.
