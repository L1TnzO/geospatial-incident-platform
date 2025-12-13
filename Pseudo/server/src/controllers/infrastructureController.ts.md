# server/src/controllers/infrastructureController.ts

## Reference

Original File: [server/src/controllers/infrastructureController.ts](server/src/controllers/infrastructureController.ts)

## Summary

Endpoints for retrieving obsolete infrastructure data.

## Pseudocode

MÓDULO infrastructureController

IMPORTAR: infrastructureRepository

MÉTODO listInfrastructure(req, res): 1. Llamar directamente a infrastructureRepository.listInfrastructure(). 2. Retornar JSON { data: infraItems }.
