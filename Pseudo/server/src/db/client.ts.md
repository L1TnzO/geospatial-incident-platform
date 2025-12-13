# server/src/db/client.ts

## Reference

Original File: server/src/db/client.ts

## Summary

Knex database client singleton.

## Pseudocode

MÓDULO db/client

IMPORTAR: knex, knexConfig

VARIABLE GLOBALE instance (Singleton Knex)

FUNCIÓN getDb(): 1. Si 'instance' existe, retornarla. 2. Determinar entorno (development, test, production). 3. Obtener configuración de knexConfig. 4. Inicializar Knex con config. 5. Guardar en 'instance' y retornar.

FUNCIÓN closeDb(): 1. Si existe 'instance', llamar destroy(). 2. Resetear 'instance' a null.
