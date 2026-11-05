# Modelo de datos inicial — JurisFlow Argentina

**Estado:** diseño lógico, no migración ejecutable.  
**Versión:** 0.1  
**Dependencias:** ninguna elegida. No presupone Supabase ni otro proveedor.

Este documento traduce la arquitectura nacional a entidades y relaciones. No crear tablas productivas ni cargar datos reales a partir de este borrador sin completar las políticas de seguridad y revisar la implementación.

## 1. Reglas de diseño

- Identificadores UUID generados en servidor.
- Fechas almacenadas con zona horaria (timestamptz) y mostradas según configuración del usuario.
- Datos de trabajo siempre vinculados a una organización.
- created_at, updated_at y, cuando corresponda, created_by.
- Borrado lógico o archivado para registros jurídicos; evitar borrados físicos accidentales.
- No duplicar datos personales innecesariamente.
- No guardar documentos confidenciales en almacenamiento público.
- Las claves foráneas y restricciones deben impedir relaciones entre organizaciones distintas.
- Las políticas de autorización deben ejecutarse en el servidor/base de datos. Ocultar elementos de interfaz no es seguridad.

## 2. Entidades y relaciones

### Identidad y espacios de trabajo

**users**
- id: UUID que corresponde a la identidad autenticada del proveedor elegido.
- display_name, email (solo los datos mínimos necesarios).
- created_at, updated_at.

**organizations**
- id, name, legal_name opcional, tax_id opcional.
- created_at, updated_at, archived_at.

**memberships**
- id, organization_id, user_id.
- role: inicialmente owner, admin, lawyer, assistant, read_only.
- status: invited, active, suspended.
- Restricción única (organization_id, user_id).

Un usuario puede pertenecer a más de un estudio. El rol pertenece a la membresía, no al usuario global.

### Clientes

**clients**
- id, organization_id, created_by.
- kind: individual o company.
- first_name, last_name, business_name.
- document_type, document_number (opcionales; acceso restringido).
- email, phone, address, province_code, locality.
- notes (texto confidencial, permisos restringidos).
- status: active, inactive, archived.
- created_at, updated_at, archived_at.

No usar DNI/CUIT como identificador primario. La unicidad documental debe definirse con cuidado por organización y tipo de documento, permitiendo registros incompletos cuando la operación lo requiera.

### Jurisdicciones y expedientes

**jurisdictions**
- id, code, name, level (provincial, national, federal, autonomous_city).
- parent_id opcional.
- Catálogo versionable; no codificar las 24 jurisdicciones en lógica de interfaz.

**courts**
- id, jurisdiction_id, name, court_type, official_url opcional.
- valid_from, valid_to opcionales.

**matters**
- id, organization_id, created_by.
- title (carátula), case_number (número de expediente).
- jurisdiction_id, court_id opcional.
- court_order: provincial, national, federal u otro valor validado.
- subject_area (fuero/materia), procedural_stage.
- status: open, paused, closed, archived.
- confidentiality_level y notes.
- created_at, updated_at, archived_at.

La jurisdicción, el orden judicial, el fuero y el tribunal son dimensiones distintas. El sistema no debe completar automáticamente una norma procesal por inferencia.

**matter_parties**
- id, organization_id, matter_id, client_id.
- party_role (actor, demandado, imputado, víctima, tercero, etc.; catálogo extensible).
- created_at.

Debe garantizarse que el expediente y el cliente pertenezcan a la misma organización.

### Documentos, agenda y auditoría

**documents**
- id, organization_id, matter_id opcional, client_id opcional.
- uploaded_by, storage_key privado, original_filename, mime_type, size_bytes.
- classification, checksum, created_at, archived_at.

No almacenar el contenido binario en una URL pública ni exponer storage_key al navegador como acceso directo. Los enlaces de descarga deben ser autorizados y temporales.

**tasks**
- id, organization_id, matter_id opcional, assigned_to.
- title, description, due_at, status, created_by, created_at, updated_at.

**events**
- id, organization_id, matter_id opcional.
- title, starts_at, ends_at, location, event_type, created_by.

**audit_events**
- id, organization_id, actor_user_id.
- action, resource_type, resource_id, occurred_at.
- metadata mínima y no sensible; evitar copiar documentos, credenciales o contenido completo de conversaciones en logs.

### Fuentes jurídicas y asistente IA (etapas posteriores)

**legal_sources**
- id, jurisdiction_id, source_type, issuing_body.
- official_identifier, title, official_url, published_at, effective_from, effective_to.
- retrieved_at, content_checksum, verification_status.

**ai_conversations**
- id, organization_id, owner_user_id, matter_id opcional.
- title, created_at, updated_at.

**ai_messages**
- id, conversation_id, role, content, created_at.
- Referencias a fuentes consultadas mediante una tabla de relación específica; no confiar en citas generadas como texto sin validación.

Cada petición a IA debe volver a comprobar la autorización del usuario sobre la conversación, el expediente, los documentos y las fuentes recuperadas. El contexto de IA no es una vía alternativa para saltarse permisos.

## 3. Matriz inicial de permisos

| Acción | Owner | Admin | Lawyer | Assistant | Read-only |
|---|---:|---:|---:|---:|---:|
| Administrar organización y miembros | Sí | Según delegación | No | No | No |
| Ver clientes autorizados | Sí | Sí | Sí | Según permiso | Sí |
| Crear/editar clientes | Sí | Sí | Sí | Según permiso | No |
| Ver expedientes autorizados | Sí | Sí | Sí | Según permiso | Sí |
| Administrar permisos sensibles | Sí | Según delegación | No | No | No |
| Exportar datos | Sí | Según política | Según permiso | No por defecto | No |

Esta matriz es un punto de partida. Antes de implementarla se deben definir permisos por expediente, restricciones de confidencialidad y revocación inmediata de accesos.

## 4. Índices y restricciones a prever

- Índices por organization_id en todas las tablas de trabajo.
- Índices compuestos para búsquedas frecuentes: clientes por organización/estado y expedientes por organización/estado/jurisdicción.
- Claves foráneas compuestas que incluyan organization_id cuando corresponda para evitar asociaciones cruzadas.
- Restricciones CHECK para estados y tipos.
- Unicidad de membresía por organización/usuario.
- Índices documentales no deben filtrar información sensible entre organizaciones.

## 5. Seguridad que bloquea producción

Antes de conectar la interfaz a una base de datos:
1. Elegir proveedor de identidad y validar sus límites gratuitos, exportación y condiciones.
2. Implementar autorización del lado servidor y políticas de fila/tenant para cada tabla.
3. Probar accesos cruzados con dos organizaciones y dos usuarios.
4. Implementar almacenamiento privado y descargas autorizadas.
5. Definir retención, eliminación, exportación, backups y recuperación.
6. Revisar requisitos de protección de datos y secreto profesional aplicables.
7. Evitar que logs, analítica o IA reciban datos personales no necesarios.

**No hay proveedor elegido ni servicio activado. Este documento no autoriza gastos.**
