# client/src/lib/http.ts

## Reference

Original File: [client/src/lib/http.ts](client/src/lib/http.ts)

## Summary

Cliente HTTP genérico basado en `fetch` con soporte para timeouts, cancelación (AbortSignal), autenticación (Bearer token), serialización de parámetros de consulta y manejo de errores tipados.

## Pseudocode

```typescript
/*
    Clase HttpError (Extiende Error)
    Propiedades: status (number), body (HttpErrorBody).
    Constructor: Asigna mensaje, status y cuerpo del error.
*/

/*
    Constante DEFAULT_TIMEOUT_MS
    Obtener tiempo de espera por defecto desde variable de entorno VITE_API_TIMEOUT_MS o usar 15000ms.
*/

/*
    Función resolveEnv
    Helper para leer variables de entorno de import.meta sin fallar si el entorno no está definido, retornando un fallback.
*/

/*
    Función normalizeBaseUrl(path)
    Determina la URL base para la API.
    1. Obtener VITE_API_BASE_URL.
    2. Si es ruta absoluta (http), concatenar path.
    3. Si es relativa, prepender window.location.origin si existe.
*/

/*
    Función encodeQueryValue(value)
    Serializa valores para query params.
    - Arrays -> 'val1,val2'
    - Boolean -> 'true'/'false'
    - Otros -> String(value)
*/

/*
    Función buildUrl(path, query)
    Construye objeto URL.
    1. Obtener URL base normalizada.
    2. Iterar sobre objeto query y añadir parámetros a searchParams (codificados).
*/

/*
    Función createAbortController(signal, timeoutMs)
    Gestiona la cancelación de peticiones y timeouts.
    1. Si no hay signal ni timeout, retornar dummy.
    2. Crear AbortController.
    3. Si se pasa signal externa, escuchar evento 'abort' para abortar el controlador interno.
    4. Si hay timeoutMs, configurar setTimeout para abortar con 'TimeoutError'.
    5. Retornar signal del controlador y función dispose (limpieza).
*/

/*
    Función request<TResponse>(path, options)
    Core del cliente HTTP.
    
    1. Configurar valores por defecto (GET, timeout, headers).
    2. Construir URL.
    3. Configurar AbortController (timeout/signal).
    4. Combinar headers por defecto con headers pasados.
    5. Si hay authToken, añadir header Authorization: Bearer.
    6. Preparar body:
       - Si es FormData/Blob -> usar directo.
       - Si no, JSON.stringify y añadir Content-Type: application/json.
    7. Ejecutar fetch dentro de try/finally para asegurar dispose().
    8. Manejo de respuesta:
       - Si ok (2xx):
         - 204 No Content -> undefined.
         - JSON -> parsear y retornar.
         - Texto -> retornar string.
       - Si error (!ok):
         - Intentar parsear JSON de error o texto.
         - Lanzar HttpError con status y mensaje.
*/

/*
    Objeto exportado 'http'
    Métodos convenience: get, post, put, patch, delete.
    Cada uno llama a request() configurando el método HTTP correspondiente.
*/
```
