# JurisFlow Argentina — Arquitectura nacional (ADR-001)

**Estado:** propuesta base de arquitectura  
**Alcance:** definir los cimientos nacionales sin reemplazar ni romper el módulo actual de Clientes.

## 1. Decisión de producto

JurisFlow se concibe como una plataforma jurídica para toda la República Argentina desde su arquitectura inicial. La cobertura nacional es una capacidad estructural; no significa que todas las jurisdicciones o fuentes jurídicas estén ya incorporadas o verificadas.

La aplicación debe distinguir siempre:
- Provincia o jurisdicción territorial.
- Orden jurisdiccional: provincial, nacional o federal.
- Fuero o materia.
- Órgano judicial y tribunal.
- Número y carátula del expediente.
- Etapa procesal.

No se debe inferir la ley procesal aplicable solamente a partir de la provincia o del fuero.

## 2. Principios obligatorios

1. **Multiestudio y aislamiento:** cada estudio/organización es un espacio de trabajo independiente. Ningún usuario puede acceder a datos de otra organización por defecto.
2. **Autorización explícita:** acceso por membresías, roles y permisos. Los expedientes y documentos pueden tener permisos más restrictivos que los del estudio.
3. **Privacidad por diseño:** no cargar datos reales hasta contar con autenticación, autorización del servidor, controles de acceso y política de respaldo adecuados.
4. **Trazabilidad:** registrar acciones relevantes sobre clientes, expedientes, documentos, permisos y consultas asistidas por IA.
5. **IA con límites:** cada conversación debe estar vinculada a un expediente o a un espacio general autorizado. La IA solo recibe el contexto que el usuario puede consultar.
6. **Fuentes jurídicas verificables:** registrar organismo emisor, jurisdicción, identificador, fecha, URL oficial, fecha de consulta y versión. Diferenciar texto normativo, jurisprudencia, doctrina y análisis generado.
7. **Sin alucinaciones presentadas como autoridad:** si no se encuentra una fuente comprobable, la respuesta debe decirlo. Nunca inventar fallos, artículos, citas ni enlaces.
8. **Costos bajo control:** priorizar software libre y niveles gratuitos. No activar servicios, planes, APIs o infraestructura paga sin autorización expresa.
9. **Compatibilidad progresiva:** conservar el módulo de Clientes existente y evolucionarlo sin perder sus funciones.

## 3. Módulos y límites

### Núcleo de plataforma
- Organizaciones/estudios.
- Usuarios, membresías, roles y permisos.
- Preferencias y configuración regional.
- Registro de auditoría.

### Gestión jurídica
- Clientes.
- Expedientes/casos.
- Partes y relaciones entre clientes y expedientes.
- Documentos y metadatos.
- Agenda, audiencias, tareas y vencimientos.

### Conocimiento jurídico
- Catálogo de jurisdicciones, fueros y órganos judiciales.
- Fuentes normativas y jurisprudenciales.
- Versionado y vigencia de fuentes.
- Biblioteca jurídica por jurisdicción.

### Asistencia IA (etapa posterior)
- Conversaciones separadas por usuario y expediente.
- Contexto recuperado solo desde documentos y fuentes autorizados.
- Respuestas con referencias verificables y advertencias sobre vigencia.
- Registro de fuentes consultadas y del resultado entregado.

## 4. Modelo lógico inicial

Entidades previstas (nombres conceptuales; no implican todavía migraciones de base de datos):

- `organizations`: estudio u organización titular del espacio de trabajo.
- `users`: identidad autenticada.
- `memberships`: relación usuario-organización, rol y estado.
- `clients`: clientes pertenecientes a una organización.
- `matters`: expedientes/casos pertenecientes a una organización, con jurisdicción, fuero, tribunal, número, carátula y etapa.
- `matter_parties`: relación entre expedientes, clientes y rol procesal.
- `documents`: metadatos, propietario, expediente asociado, clasificación y ubicación de almacenamiento protegida.
- `tasks` y `events`: tareas, audiencias y vencimientos.
- `jurisdictions`, `courts`, `legal_subjects`: catálogos nacionales y locales.
- `legal_sources`: fuentes oficiales y sus versiones.
- `ai_conversations` y `ai_messages`: conversaciones aisladas por organización, usuario y contexto autorizado.
- `audit_events`: historial de acciones relevantes.

Toda tabla con datos de trabajo debe tener un ámbito de organización y políticas de autorización en el servidor. Los identificadores difíciles de adivinar no sustituyen los controles de acceso.

## 5. Jurisdicciones argentinas

El catálogo territorial debe contemplar las 23 provincias y la Ciudad Autónoma de Buenos Aires. Además, debe modelar por separado la justicia nacional y federal, porque no son sinónimos de una provincia.

Los catálogos deben poder ampliarse y corregirse sin modificar la lógica central de expedientes. La incorporación de cada jurisdicción requiere validar sus denominaciones, órganos, fueros, normas procesales y fuentes oficiales antes de habilitar análisis jurídico específico.

## 6. Estado real del repositorio al iniciar esta etapa

- Aplicación React + Vite.
- Módulo de Clientes existente con alta, edición, ficha, búsqueda, filtros y exportación CSV.
- Datos de demostración y persistencia local en el navegador.
- No hay autenticación ni base de datos compartida configuradas en esta versión.
- La interfaz contiene accesos visuales a otras secciones, pero no deben considerarse módulos implementados.
- No se deben cargar datos reales de clientes en esta etapa.

## 7. Secuencia de implementación

1. Documentar y validar arquitectura nacional y límites de seguridad.
2. Revisar y estabilizar el módulo actual de Clientes sin romper su funcionamiento.
3. Diseñar autenticación, organizaciones, membresías y autorización.
4. Diseñar e implementar persistencia segura y migración de los datos ficticios.
5. Implementar Expedientes con metadatos jurisdiccionales.
6. Incorporar documentos, agenda y auditoría.
7. Integrar fuentes jurídicas oficiales de forma gradual, empezando por jurisdicciones expresamente validadas.
8. Evaluar asistencia IA solo después de tener aislamiento, permisos y fuentes confiables.

## 8. Criterios de aceptación antes de datos reales

- Un usuario no puede consultar datos de otra organización.
- Los permisos se verifican en el servidor, no solo ocultando botones.
- Los documentos no son públicos ni accesibles mediante enlaces permanentes abiertos.
- Las acciones sensibles quedan auditadas.
- Hay política de copias de seguridad y recuperación probada.
- Se informa claramente qué jurisdicciones y fuentes están efectivamente cubiertas.
- El sistema no presenta datos ficticios como expedientes o clientes reales.
- Ningún servicio pago se activa sin autorización expresa.

## 9. Decisiones pendientes

No se elige todavía proveedor de autenticación, base de datos, almacenamiento de documentos ni proveedor/modelo de IA. Antes de elegirlos se compararán opciones gratuitas, límites, condiciones de uso, exportabilidad, seguridad y riesgo de costos inesperados.
