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
- `supabase/migrations/20261106112000_harden_public_schema_privileges.sql`: revoca los privilegios peligrosos existentes y elimina concesiones por defecto a roles de navegador para tablas y secuencias creadas por `postgres`, que es propietario de las 18 tablas de la aplicación. No modifica los privilegios de objetos administrados por Supabase bajo `supabase_admin`.
- `supabase/tests/public_schema_privileges.sql`: prueba de regresión de privilegios.

Las concesiones explícitas de DML a `authenticated` permanecen bajo las políticas RLS existentes. No se revocan los permisos de `service_role`.

## Asesores de Supabase

- Security Advisor: 0 hallazgos.
- Health Advisor: 0 hallazgos.
- Performance Advisor: 1 FK sin índice (`audit_logs.actor_id`) y 23 índices no utilizados. Los índices no utilizados son esperables en tablas vacías y no se eliminan por esta razón.
- Se preparó `supabase/migrations/20261106111200_index_audit_logs_actor_id.sql` para la FK de auditoría.

## Funciones SQL

- No se detectaron funciones ejecutables por `anon` en los esquemas inspeccionados. Las 18 tablas de `public` pertenecen a `postgres`; el rol de migraciones no puede alterar los defaults del rol de sistema `supabase_admin`, por lo que esos defaults administrados por Supabase se dejan intactos.
- Las funciones privadas con `SECURITY DEFINER` tienen permisos de ejecución restringidos; las funciones auxiliares no ejecutables por clientes permanecen privadas.
- PostgreSQL concede `EXECUTE` a `PUBLIC` por defecto para funciones nuevas; una revocación por esquema no elimina ese permiso global. Por eso no se intentó cambiar el default global de funciones de `supabase_admin` (podría afectar funciones administradas por Supabase). La prueba de regresión exige que ninguna función `SECURITY DEFINER` en `public` sea ejecutable por `anon` o `authenticated`; las funciones privilegiadas deben permanecer en `private` o revocar explícitamente `EXECUTE` al crearse.
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

La ejecución integral `42208364682` descargó los cuatro recursos oficiales y verificó los cuatro SHA-256. Los tres importadores completaron su procesamiento:

- **SAIJ provincial:** 81.674 filas; 81.673 registros válidos; 1 fila incompleta (línea 13.006); 24 jurisdicciones (23 provincias + CABA); 1.137 candidatos a duplicado.
- **Infoleg nacional:** 430.834 filas; 429.059 registros normalizados; 1.775 filas con errores de campos obligatorios; 4.509 grupos de identificadores repetidos. Se superó el límite de memoria inicial y la serialización se hace por streaming.
- **Relaciones Infoleg:** 380.481 observaciones de normas modificatorias y 385.118 de normas modificadas; 377.106 relaciones únicas en cada sentido; 3.375 y 8.012 filas duplicadas respectivamente; cero errores; simetría completa y todos los IDs resuelven contra los 426.144 IDs nacionales únicos.

La ejecución integral `42208726044` terminó con **éxito**: importadores, recuentos, simetría, resolución de IDs y conservación de filas superaron las aserciones. La comprobación final cuenta líneas mediante `readline` y streams. Se publicó el artefacto `informes-validacion-corpus-juridico` (8.408 bytes; SHA-256 `2cd5af7a669044f296b28ef8adcbbcbf58f5a3b2f89397dc8ecaaa8dfb8e0b56`), con informes JSON únicamente; vence el 20/11/2026. No se cargó información en Supabase ni se publicaron los corpus/archivos fuente.

## Estado de publicación

El PR #1 sigue abierto. No se ha fusionado ni publicado en producción. La región estadounidense, el desfase de migraciones, el hardening SQL pendiente y la validación completa del corpus impiden declarar el proyecto listo para producción.
