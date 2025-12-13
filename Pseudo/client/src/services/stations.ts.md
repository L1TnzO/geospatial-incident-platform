# client/src/services/stations.ts

## Reference

Original File: [client/src/services/stations.ts](client/src/services/stations.ts)

## Summary

Station API service.

## Pseudocode

MÓDULO services/stations

IMPORTAR: apiClient

FUNCIÓN listStations(options): - Retornar apiClient.stations.list(options).

FUNCIÓN mapStationToUi(station): - Extraer coordenadas [lng, lat]. - Si es inválido, null. - Transformar a Objeto UI: { id, name, location: { lat, lng } }.
