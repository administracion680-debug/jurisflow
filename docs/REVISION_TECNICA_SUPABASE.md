# Revisión técnica de Supabase — JurisFlow Argentina

**Última revisión:** 6 de noviembre de 2026  
**Proyecto:** JurisFlow · plan Free · PostgreSQL 17 · región `us-west-2` (Estados Unidos).

## 1. Estado actual

- Se conserva el proyecto Supabase existente; no se creó otro proyecto ni se activó facturación.
- El bucket `jurisflow-documentos` es privado, con límite de 20 MiB por archivo y MIME restringidos a PDF, documentos Office e imágenes JPEG/PNG.
- Las 18 tablas públicas actuales tienen RLS habilitado, incluida la nueva tabla `audit_logs`.
- No se cargaron clientes, expedientes, documentos ni conversaciones reales. Las tablas operativas consultadas siguen vacías; la biblioteca jurídica global contiene 14 referencias normativas y portales oficiales.
- Security Advisor y Health Advisor: **sin alertas** en la última revisión.
- Performance Advisor: muestra índices aún no usados porque la base no tiene carga de trabajo real. No informa claves foráneas sin índice.
- No hay pruebas de penetración ni pruebas de aislamiento completas con sesiones reales. Cero alertas no es una certificación de seguridad.

## 2. Seguridad implementada desde la revisión inicial

### 2.1 Aislamiento por expediente

Se reemplazó el acceso operativo general por políticas RLS separadas:
- Clientes: lectura para integrantes; alta/edición para owner/admin/lawyer/assistant; eliminación solo owner/admin.
- Expedientes: owner/admin ven todas las causas del estudio; abogados y asistentes acceden según asignación; read_only solo lectura.
- Documentos y Storage: heredan permisos de lectura/escritura del expediente. La eliminación de archivos se limita a owner/admin y abogados con escritura.
- Agenda y vencimientos: los registros generales respetan roles; los vinculados a una causa respetan sus permisos.
- Honorarios y pagos: owner/admin y abogados asignados; asistentes y read_only no acceden a finanzas.
- Conversaciones, mensajes, citas y fragmentos IA: quedan vinculados a expediente y estudio, con RLS por causa.
- Fragmentos documentales: una fila no puede referenciar un documento de otro estudio o expediente.

### 2.2 Roles y directorio

- Roles: `owner`, `admin`, `lawyer`, `assistant`, `read_only`.
- Las asignaciones de expediente solo las administra owner/admin.
- El creador de una causa recibe permiso de escritura.
- El perfil read_only no puede escribir aunque una asignación estuviera marcada como write.
- El directorio de equipo devuelve únicamente nombre y rol; no expone teléfonos ni correos de otros integrantes.
- Las funciones privadas auxiliares tienen EXECUTE revocado por defecto. Solo se otorgan los permisos necesarios a `authenticated`; las funciones de trigger no quedan invocables directamente.

### 2.3 Documentos y fuentes

- Bucket privado y enlaces firmados de corta duración.
- PDF y DOCX se extraen localmente en el navegador y se indexan como fragmentos FTS en español; no se envían a un tercero.
- PDF escaneados e imágenes JPG/PNG admiten OCR local en español con Tesseract.js. Se limita a 40 páginas escaneadas por PDF para controlar consumo del navegador; el contenido no se envía a un proveedor OCR.
- XLSX y PPTX se extraen e indexan localmente con límites de tamaño comprimido, tamaño expandido, cantidad de entradas y longitud de texto. Los formatos binarios antiguos XLS/PPT se almacenan, pero no se indexan.
- Las fuentes legales globales y del estudio tienen estado de verificación; cambios de título, cita, autoridad o URL reinician la verificación.
- La búsqueda jurídica consulta solo fuentes globales o del estudio marcadas como verificadas y fragmentos del expediente elegido.

### 2.4 Auditoría por estudio

- Tabla `audit_logs` con RLS y lectura exclusiva para owner/admin.
- Triggers en estudios, integrantes, invitaciones, clientes, expedientes, asignaciones, documentos, agenda, vencimientos, honorarios, pagos y biblioteca jurídica.
- Registra actor, fecha, tabla, identificador, acción y nombres de campos modificados; no conserva valores anteriores/nuevos, DNI, notas, importes ni contenido de documentos o mensajes.
- Los registros de auditoría no se eliminan en cascada al dar de baja un estudio.
- La prueba `supabase/tests/audit_trail.sql` verificó inserción, modificación, restricción de lectura para assistant y conservación del historial tras eliminar el estudio ficticio; todos los datos de prueba se revirtieron.

### 2.5 Modelo IA preparado, proveedor no conectado

- Conversaciones obligatoriamente asociadas a una causa.
- Mensajes de usuario insertables por el cliente; mensajes assistant/system y citas quedan reservados para un servicio de servidor.
- Citas sujetas a la misma causa y estudio que la conversación.
- La búsqueda de documentos usa PostgreSQL FTS en español; todavía no hay embeddings ni modelo generativo conectado.
- **Decisión vigente:** mantener desactivado cualquier proveedor externo de IA. No se envía contenido de expedientes a terceros. Se evaluará un modelo privado/local más adelante, sin activar costos ni transferencias de datos sin autorización expresa.

## 3. Límites operativos del plan Free

La documentación de Supabase consultada informa, entre otros límites:
- 2 proyectos activos Free por organización.
- 500 MB de base de datos por proyecto.
- 1 GB de almacenamiento de archivos.
- 5 GB de egreso.
- 50.000 usuarios activos mensuales.
- 500.000 invocaciones de Edge Functions.
- 2 millones de mensajes Realtime.
- Proyectos Free pueden pausarse tras una semana de inactividad.
- No incluye backups automáticos ni PITR.

Los límites y condiciones pueden cambiar. El plan Free sirve para desarrollo y pruebas, no ofrece por sí solo la continuidad y recuperación que requiere un sistema jurídico en producción.

## 4. Región y tratamiento de datos

El proyecto está en `us-west-2`. Antes de producción hay que evaluar latencia, residencia/transferencia internacional, contrato de tratamiento, obligaciones profesionales y base legal. No se cambia la región ni se crea otro proyecto sin autorización y evaluación de costos.

## 5. Verificado y pendiente

**Verificado por consulta técnica:**
- tablas, columnas, claves foráneas, RLS y políticas;
- funciones privadas, grants y políticas de Storage;
- bucket privado y límite de archivo;
- estado del proyecto y plan Free;
- Security Advisor y Health Advisor sin alertas;
- Performance Advisor sin advertencias de claves foráneas sin índice;
- fuentes oficiales nacionales y portales de investigación cargados en la biblioteca.

**Pendiente de validar con cuentas y documentos ficticios:**
- aislamiento extremo a extremo entre dos estudios y sesiones independientes;
- invitaciones, confirmación de correo y redirects del dominio final;
- subida, indexación, búsqueda, descarga y eliminación de documentos mediante Storage API;
- OCR funcional en navegador/dispositivo y pruebas integrales de UI;
- honorarios y pagos por rol;
- restauración de backups, monitoreo y continuidad;
- recuperación y versionado del baseline de migraciones original;
- build final de producción y despliegue.

## 6. Reproducibilidad

Las migraciones nuevas de esta etapa están versionadas en `supabase/migrations`. Las migraciones de bootstrap anteriores (desde `20261105023321` hasta `20261105212433`) figuran en el historial del proyecto Supabase, pero sus archivos SQL originales no están en el repositorio. No se debe intentar reconstruir una base vacía solo con los archivos actuales hasta recuperar o revisar ese baseline.

## 7. Próximos pasos

1. Completar pruebas de aislamiento con dos estudios y varias cuentas ficticias.
2. Verificar Auth, confirmación de correo, invitaciones y redirects.
3. Definir backup externo y probar restauración sin contratar servicios pagos.
4. Recuperar y versionar el baseline de migraciones original.
5. Probar extracción XLSX/PPTX y OCR local con documentos ficticios en un navegador/dispositivo real.
6. Mantener la IA generativa desactivada hasta disponer de una alternativa privada/local que supere la revisión de seguridad.
7. Revisar seguridad y despliegue antes de datos reales.

## Referencias oficiales

- [Supabase — Billing and plan limits](https://supabase.com/docs/guides/platform/billing-on-supabase)
- [Supabase — Pricing](https://supabase.com/pricing)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase — Storage access control](https://supabase.com/docs/guides/storage/security/access-control)

**Conclusión:** el proyecto tiene una base técnica más completa y RLS por expediente, pero sigue siendo un entorno de desarrollo. No cargar expedientes reales hasta completar las pruebas, la revisión legal y el plan de recuperación.
