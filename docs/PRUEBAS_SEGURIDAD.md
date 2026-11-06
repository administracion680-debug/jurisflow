# Pruebas de seguridad y aceptación — JurisFlow Argentina

## Estado

La primera migración de autorización por expediente está aplicada en el proyecto Supabase de desarrollo. Se ejecutó correctamente `supabase/tests/rls_two_firms.sql` con tres cuentas ficticias, dos estudios y objetos de metadatos Storage, dentro de una transacción revertida. Se comprobó aislamiento de ambos titulares, denegación de lectura cruzada en la función de búsqueda y en conversaciones/mensajes IA, y que el cliente no puede insertar mensajes `assistant` (solo `user`). El rol `read_only` no puede actualizar expedientes ni metadatos de archivos, insertar mensajes ni crear invitaciones, aunque reciba por error una asignación `write`. El titular sí puede crear invitaciones read_only; un usuario de Beta no puede invitar dentro de Alfa. También se verificó que un estudio no puede listar ni subir objetos en la ruta del otro y que `anon` no puede leer expedientes ni listar objetos privados. Security Advisor devolvió cero alertas. Estas pruebas SQL no reemplazan las pruebas de Auth, navegador y sesiones independientes.

**No cargar expedientes reales hasta completar todas las pruebas de esta guía.**

## Roles y acceso esperado

| Perfil | Expediente asignado | Expediente no asignado | Clientes del estudio | Honorarios |
|---|---|---|---|---|
| Titular (owner) | Leer y modificar | Leer y modificar | Leer y modificar | Leer y modificar |
| Administrador (admin) | Leer y modificar | Leer y modificar | Leer y modificar | Leer y modificar |
| Abogado (lawyer) | Según asignación | Sin acceso | Leer y modificar | Solo causas asignadas |
| Asistente (assistant) | Según asignación | Sin acceso | Leer y modificar | Sin acceso |
| Solo lectura (read_only) | Solo lectura | Sin acceso | Solo lectura | Sin acceso |

La administración de asignaciones a expedientes está reservada a owner/admin. El creador de una causa recibe automáticamente permiso de escritura. Un perfil read_only nunca puede escribir, aunque por error tenga una asignación marcada como write.

## Preparación de pruebas

Usar exclusivamente cuentas y datos ficticios:
- Estudio Alfa.
- Estudio Beta.
- Usuario A: titular de Alfa.
- Usuario B: abogado de Alfa asignado a causa A.
- Usuario C: abogado de Alfa sin asignación a causa A.
- Usuario D: asistente de Alfa asignado a causa A.
- Usuario E: solo lectura de Alfa asignado a causa A.
- Usuario F: titular de Beta.

Crear dos expedientes ficticios, un cliente ficticio y dos documentos ficticios en el bucket privado. No reutilizar datos de clientes ni expedientes reales.

## Casos obligatorios

1. B puede consultar y modificar la causa A y sus documentos.
2. C no puede consultar la causa A ni acceder a sus documentos por API o Storage.
3. D puede consultar y modificar la causa A, pero no puede consultar honorarios ni pagos.
4. E puede consultar la causa A, pero INSERT, UPDATE y DELETE deben devolver denegación o cero filas afectadas.
5. B no puede asignar a otra persona ni cambiar permisos de la causa.
6. F no puede consultar ningún cliente, expediente, documento, evento, vencimiento, honorario o pago de Alfa.
7. Un miembro de Alfa no puede cambiar el firm_id de una causa para moverla a Beta.
8. Un archivo subido con ruta que no respete <firm_uuid>/<case_uuid>/<filename> debe ser rechazado.
9. Un miembro asignado a una causa no puede leer un objeto de Storage de otra causa cambiando la URL o el nombre del objeto.
10. Una invitación read_only debe poder aceptarse y no debe conceder escritura.
11. Un usuario sin sesión no debe leer ni modificar filas privadas.
12. Revocar la asignación de B debe quitarle acceso a la causa y sus archivos en nuevas solicitudes.

## Pruebas adicionales de documentos, IA y privacidad

13. Un abogado asignado con escritura puede subir un PDF o DOCX, indexarlo y buscar su contenido dentro de esa misma causa.
14. Un asistente con escritura puede indexar documentos de la causa asignada, pero no eliminar archivos; un perfil read_only no puede subir ni indexar.
15. Un usuario sin acceso de lectura a la causa no puede consultar fragmentos ni ejecutar search_case_materials para esa causa.
16. Las conversaciones IA, mensajes y citas solo pueden leerse desde usuarios con acceso a la causa; el cliente solo puede insertar mensajes role=user. Mensajes assistant/system y citas deben ser insertados por un servicio de servidor.
17. Una cita no puede apuntar a documentos de otra causa ni a fuentes privadas de otro estudio.
18. El directorio de equipo devuelve solo nombre y rol; no expone teléfono ni otros datos del perfil.
19. Los seis registros legales globales apuntan a páginas oficiales; confirmar cada URL y la vigencia de la norma antes de citar en escritos.

## Verificaciones técnicas posteriores

- Consultar pg_policies y confirmar que no queden políticas permisivas antiguas en las tablas sensibles.
- Ejecutar Security Advisor y Performance Advisor.
- Verificar que el bucket jurisflow-documentos siga siendo privado.
- Verificar que ninguna clave service_role o secreta aparezca en el bundle del navegador, GitHub o variables VITE_*.
- Revisar logs de Auth, Postgres y Storage durante las pruebas.
- Repetir las pruebas después de cualquier cambio de RLS, Storage o funciones SECURITY DEFINER.

## Resultados de la prueba automatizada con dos estudios

La prueba `supabase/tests/rls_two_firms.sql` se ejecutó contra el proyecto de desarrollo y terminó sin excepciones. Incluye:

- Titular Alfa: ve su expediente y no ve el de Beta.
- Titular Beta: ve su expediente y no ve el de Alfa.
- Búsqueda jurídica y conversaciones IA: un usuario Beta no puede consultar resultados, conversaciones ni mensajes de una causa Alfa.
- Mensajería IA: el cliente puede insertar mensajes `user` en una causa con escritura, pero no puede insertar mensajes `assistant` o `system`; estos requieren un servicio de servidor.
- Invitaciones: el titular puede crear una invitación read_only; un usuario externo al estudio y un read_only no pueden invitar.
- Storage privado: Alfa puede leer y subir objetos en su ruta; Beta no puede listar ni subir en la ruta Alfa.
- Solo lectura: puede consultar la causa y metadatos de archivos asignados, pero no puede actualizar ninguno aunque la asignación tenga `access_level='write'`.
- Anónimo: no tiene privilegio SELECT sobre expedientes y no puede listar objetos del bucket privado.
- Los registros ficticios se revirtieron; se comprobó que no quedaron usuarios, estudios ni causas de prueba.

## Límites de lo ya verificado

Se verificó RLS mediante SQL con roles `authenticated` y `anon`, el aislamiento entre dos estudios ficticios, la restricción de búsqueda y el bloqueo de escritura para read_only. Todavía faltan pruebas funcionales de Storage con objetos reales de prueba, invitaciones y confirmación de correo desde navegador, recuperación de contraseña, sesiones independientes y pruebas integrales de UI. No es una certificación de seguridad ni habilita datos jurídicos reales.


## Alcance verificado y límites

El proyecto de desarrollo no tiene usuarios (`auth.users=0`), objetos en Storage (`storage.objects=0`) ni registros de auditoría. Por ello las pruebas SQL de políticas y aislamiento se complementan con inspección de políticas, pero no sustituyen un recorrido e2e con dos cuentas ficticias y archivos de prueba. El bucket es privado y las cuatro políticas vinculan acceso a `firm_id`/`case_id` mediante funciones privadas. Security Advisor: cero alertas; Performance Advisor: un hallazgo informativo por `audit_logs.actor_id` sin índice y 23 índices no usados en una base sin tráfico. No se deben borrar índices no usados sin carga representativa.
