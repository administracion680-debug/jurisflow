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

Se preparó, pero todavía no se aplicó, la propuesta `docs/sql-proposals/harden_public_schema_privileges.sql`: revoca los privilegios peligrosos existentes y elimina concesiones por defecto a roles de navegador para tablas y secuencias creadas por `postgres`, que es propietario de las 18 tablas de la aplicación. No modifica los privilegios de objetos administrados por Supabase bajo `supabase_admin`.
- `supabase/tests/public_schema_privileges.sql`: prueba de regresión de privilegios.

La propuesta no es una migración Supabase ni tiene timestamp de historial. El archivo de migración real debe generarse con Supabase CLI después de inicializar y vincular el proyecto.

Las concesiones explícitas de DML a `authenticated` permanecen bajo las políticas RLS existentes. No se revocan los permisos de `service_role`.

## Asesores de Supabase

- Security Advisor: 0 hallazgos.
- Health Advisor: 0 hallazgos.
- Performance Advisor: 1 FK sin índice (`audit_logs.actor_id`) y 23 índices no utilizados. Los índices no utilizados son esperables en tablas vacías y no se eliminan por esta razón.
- Se preparó la propuesta `docs/sql-proposals/index_audit_logs_actor_id.sql` para la FK de auditoría; no está aplicada ni registrada como migración.

## Funciones SQL

- No se detectaron funciones ejecutables por `anon` en los esquemas inspeccionados. Las 18 tablas de `public` pertenecen a `postgres`; el rol de migraciones no puede alterar los defaults del rol de sistema `supabase_admin`, por lo que esos defaults administrados por Supabase se dejan intactos.
- Las funciones privadas con `SECURITY DEFINER` tienen permisos de ejecución restringidos; las funciones auxiliares no ejecutables por clientes permanecen privadas.
- PostgreSQL concede `EXECUTE` a `PUBLIC` por defecto para funciones nuevas; una revocación por esquema no elimina ese permiso global. Por eso no se intentó cambiar el default global de funciones de `supabase_admin` (podría afectar funciones administradas por Supabase). La prueba de regresión exige que ninguna función `SECURITY DEFINER` en `public` sea ejecutable por `anon` o `authenticated`; las funciones privilegiadas deben permanecer en `private` o revocar explícitamente `EXECUTE` al crearse.
- La auditoría de permisos de funciones debe repetirse después de aplicar y versionar la propuesta de privilegios.

## Desfase de migraciones: bloqueo de reproducibilidad

El historial remoto de Supabase contiene **48 migraciones**, y el directorio `supabase/migrations` de esta rama contiene **27 archivos**.

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
- Las cuatro propuestas SQL están en `docs/sql-proposals/`: `harden_public_schema_privileges.sql`, `index_audit_logs_actor_id.sql`, `create_legal_catalog.sql` y `extend_search_case_materials.sql` (esta última depende de crear el catálogo). Ninguna se aplicó ni se cuenta como migración. Las pruebas correspondientes están en `supabase/tests/`, incluida `legal_catalog_security.sql`.
- Supabase CLI v3 cambió el destino predeterminado de los comandos de base de datos a local. Para consultar el proyecto alojado hay que usar `--remote`; los cambios remotos desatendidos requieren `--yes`. No ejecutar `db pull --remote --yes` ni otra mutación de historial sin la elección explícita del proyecto y revisión del diff. Fuente: https://supabase.com/docs/guides/local-development/cli/migrating-to-v3.

No se debe ejecutar una reconstrucción destructiva, resetear el proyecto ni marcar migraciones como aplicadas para ocultar este desfase. Hay que recuperar los SQL originales desde el historial de trabajo/artefactos del proyecto o generar un snapshot remoto verificable con Supabase CLI v3, revisarlo y recién entonces fijar una base reproducible.
## Pruebas que siguen pendientes

- Aplicar y verificar las dos migraciones de índices y privilegios.
- Ejecutar `supabase/tests/public_schema_privileges.sql` y repetir RLS de dos estudios y auditoría.
- Probar Storage API real con archivos ficticios (subida, URL firmada, descarga, actualización y borrado).
- Probar Auth, invitaciones y redirects en navegador.
- Probar OCR en dispositivo Android y extracción XLSX/PPTX con documentos ficticios.
- Revisar restauración y continuidad: el plan gratuito no ofrece backup automático.
- Evaluación jurídica de secreto profesional, ubicación de datos en Estados Unidos y transferencias internacionales antes de producción.

## Estado de validación del corpus

Dos ejecuciones integrales aprobaron:
- Run `42208726044`: validación completa inicial.
- Run `42209672155`: repetición reproducible con `npm ci`, aserciones de streaming y medición de tamaños.

Resultados:
- **SAIJ provincial:** 81.674 filas; 81.673 válidas; 1 incompleta (línea 13.006); 24 jurisdicciones; 1.137 candidatos a duplicado.
- **Infoleg nacional:** 430.834 filas; 429.059 normalizadas; 1.775 filas con errores de campos obligatorios; 4.509 grupos de IDs repetidos.
- **Relaciones Infoleg:** 380.481 observaciones modificatorias y 385.118 modificadas; 377.106 relaciones únicas en cada sentido; 3.375 y 8.012 filas duplicadas; cero errores; simetría completa; todos los IDs resuelven contra 426.144 IDs nacionales únicos.
- **Tamaños locales:** SAIJ 148.244.493 bytes; Infoleg nacional 1.308.772.585 bytes; complementarias 748.943.907 bytes; descargas oficiales combinadas 97.941.516 bytes. Las salidas suman aproximadamente 2,2 GB; no se subieron al repositorio ni a Supabase.

Artefacto `informes-validacion-corpus-juridico`: 8.407 bytes, ID `13497319853`, SHA-256 `086666ab84506fc174e7ca9e3092bf3c4e33583c6d6c31320488ee9d350a776d`; vence el 20/11/2026. Contiene solo informes JSON. No se cargó información en Supabase.
## CI y dependencias

- Se agregó y versionó `package-lock.json`; el CI instala con `npm ci`.
- `npm audit --omit=dev --audit-level=high` pasó sin vulnerabilidades de severidad alta o crítica.
- Pruebas de regresión y build de producción pasan en el HEAD `ca41c02d9dcf9840d6de93f53e8849f3bed937fb`.
- El build informa un bundle principal de aproximadamente 568 kB (158 kB gzip) y chunks de PDF/Mammoth separados. No bloquea la compilación, pero queda como optimización de rendimiento móvil; no se oculta aumentando el umbral de advertencia.

## IA por expediente

- Las tablas `ai_conversations`, `ai_messages`, `ai_citations` y `document_chunks` tienen RLS por expediente.
- `public.search_case_materials` es `SECURITY INVOKER`, exige usuario autenticado y valida `private.has_case_access`; busca fragmentos documentales y fuentes verificadas de `legal_library`.
- Las políticas permiten al cliente insertar mensajes `user`; las respuestas `assistant` y las citas deben persistirse desde un proceso servidor. No hay proveedor/modelo ni interfaz de chat funcional conectados.
- La búsqueda actual no consulta el catálogo nacional masivo porque todavía no está creado/importado.
- Se documentó una arquitectura local-first sin APIs pagas en `docs/AI_LOCAL_FIRST_PLAN.md`; queda pendiente evaluar WebGPU, tamaño del modelo, compatibilidad Android y endpoint seguro para guardar respuestas/citas.

## Revisión adicional de seguridad y corpus (6 de noviembre de 2026, 09:20 ART)

- Aplicadas en el proyecto de desarrollo las migraciones `harden_public_schema_browser_privileges` y `revoke_maintain_browser_privilege`.
- Se revocaron a `anon` y `authenticated` los privilegios `TRUNCATE`, `REFERENCES`, `TRIGGER` y `MAINTAIN` sobre las tablas públicas; se revocó `CREATE` sobre el esquema `public` y se endurecieron los privilegios por defecto para tablas y secuencias.
- La primera ejecución de la prueba detectó que PostgreSQL 17 mantenía `MAINTAIN`; se corrigió con una migración específica y se volvió a ejecutar.
- `supabase/tests/public_schema_privileges.sql`: aprobado; cero privilegios elevados de tabla para roles de navegador, sin CREATE en public, sin defaults públicos inseguros y RLS presente en las tablas públicas.
- `supabase/tests/rls_two_firms.sql`: aprobado con datos ficticios y rollback; aislamiento entre dos estudios, rol read_only, Storage privado, conversaciones y búsqueda por expediente.
- `supabase/tests/audit_trail.sql`: aprobado con datos ficticios y rollback; auditoría de metadatos, restricción de lectura y persistencia histórica tras borrar el estudio.
- Consulta posterior: cero privilegios elevados restantes para `anon`/`authenticated`.
- Migraciones remotas registradas en Supabase: 50. El repositorio contiene 29 archivos de migración; siguen faltando 21 SQL históricos exactos. No reconstruirlos por conjetura ni ejecutar un despliegue completo hasta recuperar los originales o aprobar una estrategia formal de baseline.
- Run `42216044691` del validador de corpus: éxito. Se descargaron los cuatro recursos oficiales, coincidieron sus SHA-256, se ejecutaron los tres importadores completos, se comprobaron recuentos y hashes de fila, simetría/resolución de relaciones y se generó el manifiesto compacto.
- Run `42216481387` de CI: éxito en el HEAD `9530b38e99024df2b666680e32375b8a1f98ec20`; npm ci, auditoría de dependencias, pruebas y build.
- El artefacto de informes del run `42216044691` contiene solo JSON (8.407 bytes; ID `13501935938`; SHA-256 `863363deb24573aadd0c1dd5d01e9af96ec20612d0c425dcd781fef48591948c`; vence el 20/11/2026).
- **Bloqueo de capacidad:** los JSONL locales compactos suman aproximadamente 1,27 GB (normas 741 MB, observaciones de relaciones 405 MB y relaciones canónicas 69 MB). No se subieron a Supabase ni a GitHub. La futura carga debe excluir observaciones duplicadas de la base o usar almacenamiento/índices externos; conservar los ZIP/CSV y hashes como archivo fuente. Medir tamaño real de PostgreSQL e índices antes de habilitar importación y detenerse antes de superar el presupuesto gratuito.
- El catálogo jurídico masivo sigue sin tablas ni filas importadas en Supabase. La validación de corpus no equivale a una biblioteca jurídica publicada ni a vigencia normativa confirmada.

## Estado de publicación

El PR #1 sigue abierto. No se ha fusionado ni publicado en producción. La región estadounidense, el desfase de migraciones, el hardening SQL pendiente y la validación completa del corpus impiden declarar el proyecto listo para producción.
