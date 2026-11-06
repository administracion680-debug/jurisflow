# Usuarios, organizaciones y permisos — JurisFlow Argentina

**Estado:** especificación funcional para implementación posterior.  
**Versión:** 0.1  
**Relacionado:** ARQUITECTURA_NACIONAL.md y MODELO_DATOS_INICIAL.md.

Este documento no implementa autenticación ni crea cuentas. Define el comportamiento esperado para que la futura implementación no confunda una pantalla de acceso con seguridad real.

## 1. Conceptos

- **Usuario:** identidad individual autenticada. Puede participar en uno o más estudios.
- **Organización:** espacio de trabajo independiente de un estudio, profesional o equipo jurídico.
- **Membresía:** vínculo entre un usuario y una organización, con estado, rol y permisos.
- **Expediente:** recurso de una organización con controles de acceso propios.
- **Invitación:** mecanismo para incorporar a un usuario identificado a una organización, con rol inicial y vencimiento.

Una cuenta no es propietaria automáticamente de todos los datos de los estudios donde trabaja. La propiedad y administración se resuelven por organización y membresía.

## 2. Alta inicial y creación de estudio

1. La persona crea una cuenta mediante un proveedor de identidad que se elija después de comparar opciones gratuitas y condiciones.
2. Verifica su correo o método de acceso cuando el proveedor lo permita.
3. Crea un espacio de trabajo o acepta una invitación.
4. Si crea el espacio, queda como owner inicial de esa organización.
5. El sistema crea la membresía en el servidor, no desde una operación confiada del navegador.
6. La aplicación muestra únicamente organizaciones en las que la persona tiene una membresía activa.

No permitir que el cliente web elija libremente su rol o envíe un organization_id para obtener acceso.

## 3. Roles iniciales

### Owner
- Control de la organización.
- Administra administradores, membresías y configuración.
- Puede transferir la titularidad mediante un flujo explícito y auditado.
- No puede leer expedientes a los que se haya aplicado una restricción legal o interna superior sin que exista una autorización expresa definida por la política.

### Admin
- Administra integrantes e invitaciones según delegación del titular.
- Gestiona datos operativos de la organización.
- No puede transferir titularidad ni elevarse a owner.
- No obtiene automáticamente acceso a todo expediente confidencial.

### Lawyer
- Accede a clientes y expedientes asignados o compartidos con él.
- Puede crear y editar trabajo jurídico según permisos.
- Puede invitar colaboradores solo si la política de la organización lo permite.

### Assistant
- Acceso operativo limitado a clientes, agenda y expedientes expresamente compartidos.
- No puede administrar miembros, cambiar permisos sensibles ni exportar masivamente por defecto.
- El acceso a notas jurídicas, documentos privilegiados y conversaciones IA debe poder limitarse.

### Read-only
- Puede consultar exclusivamente los recursos compartidos.
- No puede crear, modificar, eliminar, exportar ni invitar.

Los roles son plantillas iniciales, no sustitutos de permisos por recurso.

## 4. Permisos por expediente

Cada expediente debe tener una política de acceso independiente de la membresía general. Modelo inicial:
- matter_owner: responsable principal.
- editor: puede trabajar en el expediente.
- viewer: lectura autorizada.
- no_access: sin acceso, aunque pertenezca al estudio.

La aplicación debe poder compartir un expediente con uno o más integrantes, revocar el acceso y mostrar quién tiene acceso. La revocación debe impedir futuras consultas y descargas; enlaces temporales previamente emitidos deben expirar rápidamente.

Los documentos y conversaciones IA heredan como mínimo la política del expediente. Se pueden imponer restricciones más estrictas, nunca más amplias por defecto.

## 5. Invitaciones y bajas

- Invitación dirigida a una identidad concreta, con token aleatorio de un solo uso y vencimiento.
- El servidor valida invitación, organización, estado y rol permitido.
- El invitado confirma antes de activar su membresía.
- No revelar si un correo está registrado a personas no autorizadas.
- Suspender o retirar una membresía revoca el acceso inmediatamente.
- Al retirar un integrante, conservar expedientes y documentos bajo titularidad de la organización; no borrar el trabajo.
- Transferir tareas y responsabilidades mediante un flujo auditable.
- La salida de una organización no elimina la cuenta global del usuario ni sus otras membresías.

## 6. Cambio de organización

Cuando el usuario cambia de espacio de trabajo:
1. Invalidar el contexto de organización anterior en el cliente.
2. Solicitar al servidor los permisos de la nueva membresía.
3. Volver a cargar clientes, expedientes, documentos, agenda y conversaciones desde cero.
4. No reutilizar resultados en caché de la organización anterior.
5. Verificar autorización en cada petición, independientemente del selector visible.

Nunca confiar en un selector de organización como mecanismo de seguridad.

## 7. Auditoría y acciones sensibles

Registrar como mínimo:
- creación/archivo de organización;
- invitación, aceptación, suspensión y baja;
- cambio de rol o permiso;
- concesión/revocación de acceso a expediente;
- exportaciones y descargas sensibles;
- acceso administrativo excepcional;
- creación, modificación y archivo de clientes y expedientes.

La auditoría debe registrar actor, organización, acción, recurso, fecha y resultado. No guardar contraseñas, tokens, texto completo de documentos ni contenido íntegro de consultas IA en los metadatos de auditoría.

## 8. Requisitos de autenticación

El proveedor futuro debe ofrecer, como mínimo:
- sesiones seguras y revocables;
- recuperación de cuenta;
- protección contra abuso de intentos;
- verificación de correo o método equivalente;
- MFA cuando esté disponible;
- cookies/sesiones con atributos seguros para la arquitectura elegida;
- separación entre identidad y autorización de la aplicación.

No almacenar contraseñas propias ni implementar criptografía casera. No exponer claves administrativas o secretos de servidor al frontend.

## 9. Pruebas de seguridad obligatorias

Preparar pruebas automatizadas con al menos dos organizaciones (A y B), dos usuarios y un integrante compartido entre espacios:
1. Usuario A no puede listar ni leer clientes de B.
2. Alterar un ID de cliente, expediente o documento no permite acceso cruzado.
3. Usuario suspendido no puede seguir consultando datos mediante peticiones directas.
4. Un assistant no puede elevar su rol ni invitar si no tiene permiso.
5. Un viewer no puede modificar ni exportar.
6. Cambiar de organización no muestra datos cacheados de la anterior.
7. Una conversación IA no recupera documentos de expedientes sin permiso.
8. Revocar acceso a un expediente corta el acceso a sus documentos y conversaciones asociadas.
9. Una invitación vencida o ya utilizada no puede aceptarse.
10. Las acciones sensibles generan eventos de auditoría sin registrar secretos.

## 10. Criterios de aceptación

No habilitar datos reales hasta que:
- exista autenticación real;
- cada petición valide organización y permisos del lado servidor;
- las pruebas de aislamiento entre organizaciones pasen;
- la revocación de permisos esté probada;
- los documentos estén en almacenamiento privado;
- exista recuperación ante incidentes y copias de seguridad;
- se documenten límites, costos y condiciones del proveedor elegido.

**Decisión pendiente:** proveedor de autenticación y base de datos. Comparar primero opciones gratuitas, portabilidad, seguridad, límites de uso y posibilidad de exportar datos. No activar servicios pagos sin autorización expresa.
