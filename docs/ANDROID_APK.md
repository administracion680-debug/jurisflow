# Construcción de JurisFlow para Android

La aplicación Android se genera a partir de la aplicación web existente mediante Capacitor. No se duplica la lógica de negocio ni se crea una base de datos paralela.

## APK de prueba

1. Abrir la pestaña **Actions** del repositorio.
2. Seleccionar **Build Android APK**.
3. Ejecutar **Run workflow** sobre la rama `android/apk-foundation` si no se inició automáticamente.
4. Esperar que finalice el trabajo `Build JurisFlow Android APK`.
5. Descargar el artefacto `jurisflow-android-debug-apk` y extraer `app-debug.apk`.

El APK debug sirve para pruebas internas e instalación manual. No es una versión de distribución firmada para Google Play.

## Requisitos de compilación

- Node.js 22.13.1
- Java 21
- Android SDK instalado por GitHub Actions
- Capacitor 7
- Dependencias web fijadas por el package-lock existente

## Seguridad y configuración

- No se agregan claves privadas ni secretos al APK.
- La clave pública de Supabase sigue siendo una clave de cliente y la seguridad depende de RLS y las políticas del backend.
- No se activa IA externa ni servicios pagos.
- No se debe usar con expedientes reales hasta completar pruebas de autenticación, permisos, almacenamiento, enlaces de recuperación e invitaciones en un dispositivo Android.

## Próximos controles antes de producción

- Verificar inicio y cierre de sesión en Android.
- Verificar redirecciones de confirmación y recuperación de contraseña.
- Verificar selección de estudio, invitaciones y permisos.
- Probar carga/descarga de documentos y navegación externa.
- Revisar teclado, áreas seguras, rotación y pantallas pequeñas.
- Generar íconos y pantalla de inicio definitivos.
- Preparar firma de release bajo control del propietario; nunca guardar la clave de firma en el repositorio.


## Supabase Auth: confirmación de correo en Android

El APK utiliza este callback nativo para registro, confirmación y recuperación de contraseña:

`com.jurisflow.argentina://auth/callback`

En Supabase Dashboard → Authentication → URL Configuration → Redirect URLs, agregar exactamente esa dirección. La aplicación la envía mediante `emailRedirectTo`; no hace falta sustituir Site URL por una dirección inventada. Mantener Site URL en localhost solo para desarrollo local hasta publicar una URL web real.

El APK registra el esquema Android y procesa el retorno con Capacitor App + Supabase Auth (`setSession` / `exchangeCodeForSession`). Después de cambiar el código, hay que generar e instalar el APK nuevo. El APK anterior no contiene esta integración.

Verificación pendiente en dispositivo físico: crear una cuenta de prueba, abrir el correo en Gmail, tocar Confirmar correo y comprobar que Android ofrece/abre JurisFlow y que la sesión queda iniciada. No usar expedientes ni datos reales durante esta prueba.
