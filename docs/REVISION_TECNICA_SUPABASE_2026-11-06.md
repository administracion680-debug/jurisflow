# Revisión técnica de Supabase — 6 de noviembre de 2026

## Proyecto inspeccionado

- Proyecto: JurisFlow
- Referencia: `unzmbrmjrwaijkyxzxnc`
- PostgreSQL: 17.11.0.011
- Región: `us-west-2` (Estados Unidos)
- Estado: activo y saludable
- No se cargaron expedientes, clientes ni documentos reales.

## Esquema y datos

- 18 tablas en `public`; RLS habilitado en las 18.
- `legal_library`: 14 referencias globales.
- Las demás tablas operativas no contienen registros de usuarios/estudios.
- No existen tablas `legal_norms`, `legal_norm_relationships` ni `legal_import_batches`; el corpus masivo no se ha importado.
- No hay Edge Functions desplegadas.
- El bucket `jurisflow-documentos` es privado, con límite de 20 MiB y lista de MIME permitidos para PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, JPG y PNG.
- Las políticas de Storage condicionan lectura/escritura a la pertenencia y permisos sobre el expediente.

## Hallazgo de privilegios SQL

La inspección de privilegios efectivos encontró que 14 tablas públicas conceden a `anon` y `authenticated` los privilegios `TRUNCATE`, `REFERENCES`, `TRIGGER` y `MAINTAIN`. RLS no protege contra `TRUNCATE`; por eso este permiso no debe existir en roles de navegador.

Se prepararon, pero todavía no se aplicaron:
- `supabase/migrations/20261106112000_harden_public_schema_privileges.sql`: revoca los privilegios peligrosos existentes y elimina concesiones por defecto a roles de navegador para tablas, secuencias y funciones creadas por `postgres` o `supabase_admin`.
- `supabase/tests/public_schema_privileges.sql`: prueba de regresión de privilegios.

Las concesiones explícitas de DML a `authenticated` permanecen bajo las políticas RLS existentes. No se revocan los permisos de `service_role`.

## Asesores de Supabase

- Security Advisor: 0 hallazgos.
- Health Advisor: 0 hallazgos.
- Performance Advisor: 1 FK sin índice (`audit_logs.actor_id`) y 23 índices no utilizados. Los índices no utilizados son esperables en tablas vacías y no se eliminan por esta razón.
- Se preparó `supabase/migrations/20261106111200_index_audit_logs_actor_id.sql` para la FK de auditoría.

## Funciones SQL

- No se detectaron funciones ejecutables por `anon` en los esquemas inspeccionados.
- Las funciones privadas con `SECURITY DEFINER` tienen permisos de ejecución restringidos; las funciones auxiliares no ejecutables por clientes permanecen privadas.
- La auditoría de permisos de funciones debe repetirse después de aplicar la migración de privilegios.

## Desfase de migraciones: bloqueo de reproducibilidad

El historial remoto de Supabase contiene **48 migraciones**, y el directorio `supabase/migrations` de esta rama contiene **29 archivos**.

- **21 migraciones remotas todavía no tienen su SQL en el repositorio:**
  - `20261105023321_jurisflow_core_legal_modules.sql`
  - `20261105023342_secure_private_rls_helpers_and_fk_indexes.sql`
  - `20261105023355_allow_authenticated_read_global_legal_library.sql`
  - `20261105023818_firm_member_invitations_and_acceptance.sql`
  - `20261105024015_secure_profiles_firms_and_members_rls.sql`
  - `20261105024054_remove_duplicate_identity_rls_policies.sql`
  - `20261105024402_grant_authenticated_access_to_rls_protected_app_tables.sql`
  - `20261105211240_improve_clients_search_and_updated_at.sql`
  - `20261105211540_strengthen_cases_indexes_and_updated_at.sql`
  - `20261105211806_optimize_invitation_and_legal_library_access.sql`
  - `20261105212051_secure_private_document_storage_and_deduplicate_members_index.sql`
  - `20261105212125_complete_firm_membership_and_profile_lifecycle.sql`
  - `20261105212148_remove_redundant_lifecycle_triggers.sql`
  - `20261105212218_secure_firm_invitation_create_and_accept.sql`
  - `20261105212227_fix_invitation_email_validation.sql`
  - `20261105212324_harden_invitation_rpcs_with_invoker_rls.sql`
  - `20261105212342_consolidate_invitation_and_membership_policies.sql`
  - `20261105212354_optimize_invitation_email_rls_checks.sql`
  - `20261105212416_add_argentine_fees_and_payments_module.sql`
  - `20261105212433_automate_fee_payment_validation_and_status.sql`
  - `20261105221840_cases_add_parties_and_start_date.sql`
- Se alinearon los nombres de archivo de dos migraciones cuyos timestamps diferían del historial remoto: `allow_read_only_firm_invitations` y `seed_official_national_legal_research_portals`. La coincidencia de nombre y versión no permite verificar el contenido exacto que fue ejecutado en remoto; queda pendiente recuperar el SQL original o comparar un snapshot verificable.
- **2 archivos de migración de esta rama aún no figuran en el historial remoto:**
  - `20261106111200_index_audit_logs_actor_id.sql`
  - `20261106112000_harden_public_schema_privileges.sql`

No se debe ejecutar una reconstrucción destructiva, resetear el proyecto ni marcar migraciones como aplicadas para ocultar este desfase. Hay que recuperar los SQL originales desde el historial de trabajo/artefactos del proyecto o reconstruir un snapshot verificable a partir del esquema real, identificándolo claramente como reconstrucción y no como original.
## Pruebas que siguen pendientes

- Aplicar y verificar las dos migraciones de índices y privilegios.
- Ejecutar `supabase/tests/public_schema_privileges.sql` y repetir RLS de dos estudios y auditoría.
- Probar Storage API real con archivos ficticios (subida, URL firmada, descarga, actualización y borrado).
- Probar Auth, invitaciones y redirects en navegador.
- Probar OCR en dispositivo Android y extracción XLSX/PPTX con documentos ficticios.
- Revisar restauración y continuidad: el plan gratuito no ofrece backup automático.
- Evaluación jurídica de secreto profesional, ubicación de datos en Estados Unidos y transferencias internacionales antes de producción.

## Estado de validación del corpus

La ejecución del commit `5ace303716cb76237caf1e67a97a3042bf27213c` verificó descargas y SHA-256; SAIJ terminó (81.674 filas, 81.673 válidas, 1 error y 24 jurisdicciones). Infoleg nacional falló por agotamiento del heap de Node.js en aproximadamente 4 GiB. Se aumentó el heap configurado a 10 GiB en el workflow; esta mitigación debe validarse con una nueva ejecución completa. No se publicó artefacto final ni se cargó información en Supabase.

## Estado de publicación

El PR #1 sigue abierto. No se ha fusionado ni publicado en producción. La región estadounidense, el desfase de migraciones, el hardening SQL pendiente y la validación completa del corpus impiden declarar el proyecto listo para producción.
