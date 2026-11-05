# JurisFlow

Sistema de gestión jurídica. Primera entrega: módulo de clientes.

## Desarrollo local

```bash
npm install
npm run dev
```

## Compilar

```bash
npm run build
```

## Funciones incluidas
- Listado de clientes.
- Alta, edición, ficha individual y eliminación.
- Búsqueda por nombre, apellido, DNI, CUIT y correo electrónico.
- Filtro por estado activo/inactivo.
- Datos de contacto, domicilio, provincia, localidad y observaciones.
- Diseño adaptable a celulares y computadoras.

## Estado de esta primera entrega
Los registros de ejemplo y los cambios de esta versión se mantienen en memoria mientras la aplicación está abierta. Todavía no hay base de datos ni autenticación. Esos componentes deben incorporarse antes de usar datos reales de clientes.

La interfaz utiliza React, Vite y Lucide React. No se activaron servicios pagos.

## Documentación de arquitectura (en desarrollo)

Los siguientes documentos describen el diseño objetivo. Son especificaciones, no funcionalidades ya implementadas:

- [Arquitectura nacional](docs/ARQUITECTURA_NACIONAL.md)
- [Modelo de datos inicial](docs/MODELO_DATOS_INICIAL.md)
- [Usuarios, organizaciones y permisos](docs/USUARIOS_ORGANIZACIONES_PERMISOS.md)
- [Revisión técnica de Supabase y seguridad](docs/REVISION_TECNICA_SUPABASE.md)

## Próximos hitos

1. Revisar y aprobar las especificaciones.
2. Comparar opciones gratuitas de autenticación y persistencia, sin activar servicios pagos.
3. Implementar organizaciones, membresías y permisos del lado servidor.
4. Implementar expedientes con jurisdicción, fuero y tribunal.
5. Completar pruebas de aislamiento y seguridad antes de usar datos reales.

**Importante:** esta versión todavía no ofrece autenticación ni almacenamiento persistente compartido. Los datos de demostración del módulo de clientes no son adecuados para información jurídica real.
