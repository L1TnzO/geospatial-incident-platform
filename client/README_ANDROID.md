# Generación de APK Android con Capacitor

Este proyecto ha sido configurado para generar una aplicación Android nativa utilizando Capacitor.

## Requisitos Previos

Para generar el APK, necesitas tener instalado en tu sistema:

1.  **Java Development Kit (JDK)**: Versión 17 o superior (recomendado JDK 17 o 21).
2.  **Android SDK**: Necesario para compilar la aplicación. Puedes instalarlo a través de Android Studio o las herramientas de línea de comandos.
    *   Asegúrate de definir la variable de entorno `ANDROID_HOME` apuntando a tu instalación del SDK.

## Generar el APK

Hemos creado un script automatizado para facilitar el proceso. Desde el directorio `client`, ejecuta:

```bash
npm run apk
```

Este comando realizará los siguientes pasos:
1.  Construirá la aplicación web (`npm run build`).
2.  Sincronizará los archivos con el proyecto nativo (`npx cap sync`).
3.  Compilará el APK en modo Debug (`./gradlew assembleDebug`).

El APK generado se encontrará en:
`android/app/build/outputs/apk/debug/app-debug.apk`

## Solución de Problemas

### Error: SDK location not found
Si ves este error, significa que Gradle no puede encontrar el Android SDK.
1.  Instala Android Studio.
2.  Abre el proyecto `client/android` en Android Studio.
3.  Deja que Android Studio configure el SDK y las dependencias automáticamente.

### Error de versión de Java
Si tienes problemas con la versión de Java, asegúrate de que `JAVA_HOME` apunte a una instalación válida de JDK 17 o 21.
El proyecto está configurado para descargar automáticamente una cadena de herramientas compatible si es necesario, pero requiere acceso a internet y configuración de repositorios (ya configurado en `settings.gradle`).
