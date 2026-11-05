# Revisión técnica inicial de Supabase — JurisFlow

**Fecha de revisión:** 5 de noviembre de 2026  
**Alcance:** lectura de configuración y metadatos del proyecto conectado. No se modificó la base de datos.

## 1. Estado confirmado

- Existe un proyecto Supabase llamado **JurisFlow**.
- Estado del proyecto: activo y saludable.
- Organización: plan **Free**.
- Región configurada: `us-west-2` (Estados Unidos, costa oeste).
- Base de datos: PostgreSQL 17.
- Se encontraron 12 tablas en `public`, entre ellas perfiles, estudios, miembros, clientes, expedientes, agenda, vencimientos, documentos, invitaciones y pagos.
- Las tablas revisadas tienen RLS habilitado.
- Las tablas revisadas reportan cero filas en este momento.
- Existe un bucket de Storage llamado `jurisflow-documentos`, privado, con límite de 20 MiB por archivo y tipos MIME restringidos a documentos ofimáticos/PDF e imágenes JPEG/PNG.
- El asesor de seguridad de Supabase no devolvió alertas en esta consulta. Esto no equivale a una auditoría ni certifica que el sistema sea seguro.

## 2. Hallazgos que impiden usar datos jurídicos reales

### 2.1 El acceso actual es por estudio, no por expediente

Las políticas RLS de clientes, expedientes, agenda, vencimientos, documentos, honorarios y pagos usan la condición de pertenecer al estudio (`private.is_firm_member(firm_id)`).

Consecuencia: un integrante de un estudio puede acceder a todos los recursos de ese estudio que estén cubiertos por esas políticas. Todavía no se observa aislamiento por expediente para restringir el acceso a un abogado asignado, ni herencia de permisos a documentos y conversaciones IA.

**Corrección requerida:** agregar permisos por expediente (responsable, editor, lector y acceso revocado), y hacer que las políticas de expedientes, documentos, archivos y futuras conversaciones IA los apliquen en el servidor.

### 2.2 Roles incompletos

La restricción de roles en `firm_members` contempla `owner`, `admin`, `lawyer` y `assistant`. No contempla aún un rol `read_only` separado. Además, varias políticas actuales dan a cualquier miembro acceso de escritura/eliminación en módulos operativos.

**Corrección requerida:** matriz explícita de permisos por rol y recurso; el rol asistente y el rol de solo lectura no deben recibir permisos generales de escritura o eliminación.

### 2.3 La interfaz todavía no usa autenticación ni base de datos

El código actual de `src/App.jsx` conserva los clientes en `localStorage` y utiliza registros de demostración. No se debe confundir el proyecto Supabase activo con una integración ya terminada de la aplicación.

**Corrección requerida:** integrar autenticación real y sustituir el almacenamiento local de clientes por operaciones protegidas en Supabase. No exponer claves secretas o de servicio en el navegador.

### 2.4 Copias de seguridad y continuidad

El plan Free tiene límites de uso y no incluye copias de seguridad automáticas del proyecto ni recuperación punto en el tiempo. Los proyectos Free pueden pausarse después de una semana de inactividad.

**Consecuencia:** sirve para desarrollo y pruebas controladas, pero no ofrece por sí solo las garantías operativas que necesita un sistema de expedientes profesionales. Antes de producción habrá que definir copias de seguridad externas, restauración probada, monitoreo y un plan de continuidad. Si eso requiere un plan pago, no se activará sin autorización.

### 2.5 Región

El proyecto existente está en `us-west-2`. La elección de región debe evaluarse por latencia para usuarios de Argentina, residencia/transferencia internacional de datos, condiciones contractuales y posibilidades de migración. No cambiar la región ni crear otro proyecto sin decisión explícita y evaluación de costos.

## 3. Límites del plan Free consultados

La documentación oficial de Supabase consultada indica, entre otros límites:
- 2 proyectos activos Free por organización.
- 500 MB de base de datos por proyecto.
- 1 GB de almacenamiento de archivos.
- 5 GB de egreso.
- 50.000 usuarios activos mensuales.
- 500.000 invocaciones de Edge Functions.
- 2 millones de mensajes Realtime.
- Los proyectos Free pueden pausarse tras una semana de inactividad.
- No incluye backups automáticos ni PITR.

Estos límites pueden cambiar y deben revisarse antes de cualquier despliegue o decisión de producción.

## 4. Qué se verificó y qué no

Verificado por consultas de solo lectura:
- tablas, columnas, claves foráneas y estado RLS;
- políticas RLS existentes;
- definiciones de tres funciones auxiliares privadas de membresía/rol/correo;
- grants de tablas a `anon` y `authenticated`;
- bucket y políticas de almacenamiento;
- estado del proyecto y plan de la organización;
- lista de migraciones registradas;
- resultado sin alertas del asesor de seguridad en la consulta realizada.

No verificado:
- pruebas de penetración;
- pruebas de acceso cruzado con dos usuarios reales;
- funcionamiento integral de registro, confirmación de correo y recuperación;
- envío de correos de invitación en condiciones de producción;
- restauración de copias de seguridad;
- revisión legal/contractual de tratamiento y transferencia de datos;
- integración de la interfaz React con el backend.

## 5. Próxima secuencia segura

1. Exportar/respaldar el esquema actual y mantener el proyecto sin datos reales.
2. Versionar en GitHub las migraciones SQL existentes y cualquier cambio futuro.
3. Diseñar y probar permisos por expediente y permisos por rol, sin ampliar accesos por defecto.
4. Añadir pruebas automatizadas de aislamiento entre estudios, integrantes y expedientes.
5. Integrar autenticación y el módulo Clientes contra Supabase, conservando la interfaz actual.
6. Implementar Expedientes y documentos privados con herencia de permisos.
7. Definir respaldo/recuperación, monitoreo y condiciones de producción.

## 6. Referencias oficiales

- [Supabase — Billing and plan limits](https://supabase.com/docs/guides/platform/billing-on-supabase)
- [Supabase — Pricing](https://supabase.com/pricing)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase — Changelog y breaking changes](https://supabase.com/changelog?types=breaking-change)

**Conclusión:** conservar el proyecto Supabase existente para desarrollo. No crear otro ni activar un plan pago. Antes de conectar la interfaz o introducir datos reales, resolver el aislamiento por expediente y las limitaciones de respaldo/continuidad.
