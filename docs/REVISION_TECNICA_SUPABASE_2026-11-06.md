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

Las migraciones `20261106092000_harden_public_schema_browser_privileges.sql` y `20261106093000_revoke_maintain_browser_privilege.sql` ya fueron creadas, aplicadas al proyecto de desarrollo y verificadas. La prueba `supabase/tests/public_schema_privileges.sql` pasó después de ambas; no confundir la propuesta histórica con el estado remoto actual.

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
- La auditoría de permisos de funciones debe repetirse antes de producción; el hardening de privilegios de tablas ya fue aplicado y verificado en desarrollo.

## Historial de migraciones: recuperado y cotejado

El historial remoto de Supabase contiene **50 migraciones** y la rama contiene ahora **50 archivos SQL** con los mismos nombres de versión y migración.

- Se recuperaron las 21 migraciones que faltaban consultando las sentencias almacenadas en `supabase_migrations.schema_migrations.statements`; no se reconstruyeron por conjetura.
- Se cotejaron los contenidos SQL de las 50 migraciones contra las sentencias registradas en el proyecto remoto. Resultado: **50/50 coincidencias exactas**.
- Se corrigieron dos nombres de archivo cuyo timestamp local no coincidía con la versión remota: `20261106121635_harden_public_schema_browser_privileges.sql` y `20261106121722_revoke_maintain_browser_privilege.sql`.
- La comprobación de nombres dio 50 archivos locales, 50 registros remotos, cero faltantes y cero extras.
- Esta tarea solo recuperó/versionó archivos en GitHub. **No volvió a ejecutar migraciones, no alteró el esquema remoto y no marcó versiones nuevas como aplicadas.**

El historial queda reproducible a nivel de SQL registrado. Antes de producción todavía corresponde validar el flujo completo en una instancia limpia/staging y no ejecutar `db reset` ni una aplicación masiva contra el proyecto de desarrollo.

## Pruebas que siguen pendientes

- La prueba de privilegios, RLS entre dos estudios y auditoría ya pasó en desarrollo; repetirla en un entorno de staging antes de producción.
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

## Revisión adicional de seguridad y corpus (6 de noviembre de 2026)

- Aplicadas en el proyecto de desarrollo las migraciones `harden_public_schema_browser_privileges` y `revoke_maintain_browser_privilege`.
- Se revocaron a `anon` y `authenticated` los privilegios `TRUNCATE`, `REFERENCES`, `TRIGGER` y `MAINTAIN` sobre las tablas públicas; se revocó `CREATE` sobre el esquema `public` y se endurecieron los privilegios por defecto para tablas y secuencias.
- La primera ejecución de la prueba detectó que PostgreSQL 17 mantenía `MAINTAIN`; se corrigió con una migración específica y se volvió a ejecutar.
- `supabase/tests/public_schema_privileges.sql`: aprobado; cero privilegios elevados de tabla para roles de navegador, sin CREATE en public, sin defaults públicos inseguros y RLS presente en las tablas públicas.
- `supabase/tests/rls_two_firms.sql`: aprobado con datos ficticios y rollback; aislamiento entre dos estudios, rol read_only, Storage privado, conversaciones y búsqueda por expediente.
- `supabase/tests/audit_trail.sql`: aprobado con datos ficticios y rollback; auditoría de metadatos, restricción de lectura y persistencia histórica tras borrar el estudio.
- Consulta posterior: cero privilegios elevados restantes para `anon`/`authenticated`.
- Corrección posterior verificada: 50 registros remotos y 50 archivos locales; comparación de Git blob SHA-1 de cada archivo contra las sentencias remotas: 50/50 coincidencias, cero faltantes, extras o diferencias. No se reejecutó ninguna migración.
- Run `42216044691` del validador de corpus: éxito. Se descargaron los cuatro recursos oficiales, coincidieron sus SHA-256, se ejecutaron los tres importadores completos, se comprobaron recuentos y hashes de fila, simetría/resolución de relaciones y se generó el manifiesto compacto.
- Run `42216481387` de CI: éxito en el HEAD `9530b38e99024df2b666680e32375b8a1f98ec20`; npm ci, auditoría de dependencias, pruebas y build.
- El artefacto de informes del run `42216044691` contiene solo JSON (8.407 bytes; ID `13501935938`; SHA-256 `863363deb24573aadd0c1dd5d01e9af96ec20612d0c425dcd781fef48591948c`; vence el 20/11/2026).
- Catálogo compacto v3 validado integralmente en run `42261459866` (éxito): 510.732 normas y 377.106 relaciones canónicas; JSONL de normas 438.565.617 bytes (418,25 MiB) y relaciones 37.061.813 bytes (35,34 MiB), total 475.627.430 bytes (453,59 MiB). Este tamaño es de intercambio, no de PostgreSQL; no se importó el catálogo. La base de desarrollo medía 13.522.611 bytes antes de cualquier importación. El tamaño real con heap e índices debe medirse con un piloto aislado/reversible y detenerse preventivamente en 350 MB o 70% de cuota, lo que ocurra primero.
- El catálogo jurídico masivo sigue sin tablas ni filas importadas en Supabase. La validación de corpus no equivale a una biblioteca jurídica publicada ni a vigencia normativa confirmada.
- CI del HEAD `398ce5f0c2028677d24c8dc7ca3f598e93a8e970`: éxito (npm ci, auditoría de dependencias, pruebas y build). El workflow de corpus reducido v3 `42261459866`: éxito, incluyó descarga y SHA-256, tres importadores, compactación, análisis de bytes, validación de procedencia y recuentos. Artefacto de informes JSON `13524179994`, 9.676 bytes, SHA-256 `4fd5ce0b37e36137ef2735f71f53ad3c9860630e35eeb57d03e6029407af59c5`, vence 20/11/2026.

## Estado de publicación

El PR #1 sigue abierto. No se ha fusionado ni publicado en producción. La región estadounidense, las pruebas de Storage/Auth aún pendientes, la revisión de privacidad y la validación integral del catálogo reducido impiden declarar el proyecto listo para producción.


## Corrección de estado — 6 de noviembre de 2026, HEAD 398ce5f

- Historial de migraciones cotejado mediante Git blob SHA-1: 50/50 coincidencias exactas con Supabase, cero faltantes/extras/diferencias.
- Catálogo compacto v3: workflow integral `42261459866` aprobado; 510.732 normas y 377.106 relaciones; salida JSONL total 475.627.430 bytes. La cifra no es tamaño PostgreSQL. No se importaron tablas ni registros.
- CI `42261471511` aprobado en este HEAD: npm ci, auditoría, pruebas de regresión y build.
- Security Advisor: cero alertas; Health Advisor: cero alertas. Performance Advisor: una FK sin índice (`audit_logs.actor_id`) y 23 índices no usados (tablas vacías); no se eliminan índices sin carga real.
- La propuesta de esquema de catálogo v3 y sus índices siguen siendo propuestas no aplicadas. Falta prueba aislada de tamaño real, importación por lotes idempotente y rollback antes de decidir si el corpus cabe en el proyecto Free.
- El PR #1 sigue abierto. No se fusionó ni desplegó. No se cargaron datos reales ni se activaron servicios pagos. IA generativa sigue deshabilitada.


## Medición física v4 — PostgreSQL 17

El workflow `42263728893` cargó el catálogo completo en PostgreSQL 17.11 efímero, creó las claves e índices propuestos y midió heap/índices: 317.054.976 bytes (302,37 MiB) de catálogo. Sumando los 13.522.611 bytes de la base Supabase previa, la estimación es 330.577.587 bytes (315,26 MiB), por debajo del presupuesto preventivo de 350 MiB por 34,74 MiB. No se aplicó el esquema ni se cargaron datos en Supabase. Detalle reproducible en `docs/INFORME_MEDICION_POSTGRESQL_CATALOGO_2026-11-06.md`.


## Conciliación exhaustiva del historial de migraciones — 6 de noviembre de 2026

Se consultó `supabase_migrations.schema_migrations` directamente en el proyecto de desarrollo y se cotejaron las 50 filas remotas con los 50 archivos de `supabase/migrations` en `architecture/national-foundation`. Para cada versión se comparó el contenido completo del archivo local con `statements.join("\n")` recuperado de la fila remota. Resultado: **50/50 coinciden byte por byte; 0 faltantes; 0 diferencias; 0 filas remotas sin sentencias**. Esto reemplaza el conteo preliminar de una brecha histórica de 21 migraciones, que ya no corresponde al estado actual. No se reejecutó ninguna migración ni se modificó la base remota durante esta conciliación.


## Verificación adicional de Supabase — 6 de noviembre de 2026, 17:44 ART

- Proyecto de desarrollo: base de datos de 13.522.611 bytes; `auth.users` = 0; `storage.objects` del bucket JurisFlow = 0; `audit_logs` = 0; `legal_library` = 14 filas. No hay cuentas ni documentos reales en el proyecto.
- Esquema `public`: 18 tablas con RLS habilitado, 0 tablas públicas sin RLS y 62 políticas públicas.
- Bucket `jurisflow-documentos`: privado, límite 20 MiB, lista explícita de tipos PDF/Office/JPG/PNG; 4 políticas de Storage para SELECT/INSERT/UPDATE/DELETE, vinculadas al estudio y expediente mediante funciones privadas de autorización. Las políticas fueron inspeccionadas, pero la API de Storage no se probó con cuentas reales porque el proyecto no tiene usuarios ni archivos.
- Security Advisor: 0 hallazgos. Performance Advisor: 1 hallazgo INFO por FK sin índice (`audit_logs.actor_id`) y 23 índices no usados. Los índices no usados no se eliminan: el proyecto no tiene usuarios ni carga real y quitarlos ahora podría degradar consultas futuras. Existe propuesta SQL `docs/sql-proposals/index_audit_logs_actor_id.sql`, aún no aplicada; su migración deberá generarse con Supabase CLI y probarse antes de aplicarse.
- Las 3 funciones `SECURITY DEFINER` del esquema público fueron inspeccionadas: dos son funciones de trigger para crear propietario/perfil y usan `search_path` vacío; la tercera es el event trigger de habilitación automática de RLS y fija `search_path` a `pg_catalog`. No son RPC de negocio expuestas a clientes.
- CI del HEAD actual `c8cad030b48542a0e06b37693ff1c938871cc9c1` (workflow `42291126785`) pasó: instalación reproducible, auditoría de dependencias de producción, sintaxis del benchmark, pruebas y build.
- La validación integral del corpus `42264919372` pasó con descargas oficiales, importadores, validaciones de integridad y benchmark PostgreSQL 17.11. Catálogo: 302,37 MiB; estimación con la base existente: 315,26 MiB. Sigue sin cargarse en Supabase.
- Las pruebas e2e de Auth/Storage no pueden considerarse realizadas: `auth.users` está vacío. No cargar expedientes reales hasta completar esas pruebas con cuentas ficticias y revisión jurídica de privacidad.
