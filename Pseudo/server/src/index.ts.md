# server/src/index.ts

## Reference

Original File: [server/src/index.ts](server/src/index.ts)

## Summary

Server entry point.

## Pseudocode

MÓDULO index

IMPORTAR: http, env, createApp

CONSTANTE app = createApp()
CONSTANTE server = http.createServer(app)

INICIAR SERVIDOR: - Escuchar en env.port - Loguear mensaje de éxito con versión y entorno.

MANEJO DE SEÑALES (SIGTERM, SIGINT): - Cerrar servidor (server.close). - Salir del proceso (process.exit(0)).
