# server/src/config/env.ts

## Reference

Original File: server/src/config/env.ts

## Summary

Environment configuration and validation.

## Pseudocode

MÓDULO config/env

IMPORTAR: dotenv, fs, path

DEFINIR orden de búsqueda de archivos .env: 1. .env (root) 2. .env.{NODE_ENV} 3. config/.env, config/.env.local, infra defaults.

CARGAR variables: - Iterar archivos en orden. - Si existe, cargar con dotenv (sin override).

HELPER parsePort(val, fallback): - Convertir a entero. Si es inválido, usar fallback.

EXPORTAR objeto 'env': - nodeEnv: defaults 'development' - port: defaults 4000 - serviceName: defaults 'geospatial-incident-backend' - version: package version o '0.0.0'
