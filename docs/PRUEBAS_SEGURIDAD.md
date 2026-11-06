# Pruebas de seguridad y aceptación — JurisFlow Argentina

## Estado

La primera migración de autorización por expediente está aplicada en el proyecto Supabase de desarrollo. El asesor de seguridad de Supabase devolvió cero alertas en la revisión posterior. Eso no reemplaza las pruebas funcionales de acceso con usuarios separados.

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

## Límites de lo ya verificado

Se verificó que las políticas fueron creadas, que RLS está habilitado en las tablas revisadas y que Security Advisor no reportó alertas. Aún no se ejecutó una batería real con dos estudios y múltiples sesiones de usuario. Por eso el sistema no está certificado para producción ni para datos jurídicos reales.
