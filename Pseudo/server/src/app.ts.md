# server/src/app.ts

## Reference

Original File: [server/src/app.ts](server/src/app.ts)

## Summary

Express app setup and middleware configuration.

## Pseudocode

MÓDULO app

IMPORTAR: Express, Cors, Routes, Middleware

FUNCIÓN createApp(): 1. Instanciar aplicación Express. 2. Configurar Middlewares Globales: - CORS (origin: true, credentials: true) - Parsing JSON (express.json) - Parsing URL-encoded (express.urlencoded) 3. Montar Rutas: - app.use('/', routes) -> Delega al router principal 4. Montar Manejo de Errores (post-rutas): - notFoundHandler (para 404) - errorHandler (para errores capturados) 5. Retornar instancia app.

EXPORTAR createApp
