# client/src/lib/leaflet.ts

## Reference

Original File: [client/src/lib/leaflet.ts](client/src/lib/leaflet.ts)

## Summary

Configuración global de Leaflet para asegurar que los iconos de los marcadores se carguen correctamente a través del empaquetador (bundler).

## Pseudocode

```typescript
/*
    Configuración de Iconos Leaflet (L.Icon.Default)
    Soluciona problemas de rutas de assets en Leaflet al usar bundlers como Vite/Webpack.
    
    1. Importar imágenes de marcadores (normal, retina, sombra).
    2. Usar L.Icon.Default.mergeOptions para sobreescribir las URLs de los iconos por defecto con las importadas.
*/

/*
    Exportar instancia de Leaflet (L) como 'leaflet'.
*/
```
