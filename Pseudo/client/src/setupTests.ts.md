# client/src/setupTests.ts

## Reference

Original File: [client/src/setupTests.ts](client/src/setupTests.ts)

## Summary

Configuración global para pruebas unitarias con Vitest y Testing Library. Incluye limpieza de mocks y polyfills necesarios (matchMedia).

## Pseudocode

```typescript
/*
    Setup
    - Importar jest-dom para matchers extendidos.
    - BeforeEach: Limpiar todos los mocks de vi (Vitest).
    - Polyfill: window.matchMedia (necesario para componentes que usan media queries en entorno jsdom).
*/
```
