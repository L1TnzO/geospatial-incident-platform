# server/src/db/utils.ts

## Reference

Original File: server/src/db/utils.ts

## Summary

Utilities for handling PostGIS geometries and JSON columns.

## Pseudocode

MÓDULO db/utils

FUNCIÓN parseGeometry(value): - Si es nulo, retornar null. - Si es objeto, retornarlo tal cual. - Si es string, JSON.parse(). - Sino error.

FUNCIÓN geometryToFeature(geometry): - Envolver geometría en objeto GeoJSON Feature estándar. - { type: 'Feature', geometry, properties: {} }

FUNCIÓN parseJsonColumn(value, fallback): - Intentar parsear string JSON. - Si falla o es nulo, retornar fallback.

FUNCIÓN parseNumber(value): - Convertir seguro a Number. - Retornar null si es NaN o nulo.
