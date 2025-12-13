# client/src/hooks/use-media-query.ts

## Reference

Original File: [client/src/hooks/use-media-query.ts](client/src/hooks/use-media-query.ts)

## Summary

Hook personalizado para evaluar media queries de CSS en componentes React.

## Pseudocode

```typescript
/*
    Hook useMediaQuery(query)
    Entrada: String de media query (e.g., "(min-width: 768px)").
    Salida: Booleano (matches).

    1. Estado inicial: Evaluar window.matchMedia(query).matches (o false si SSR).
    2. Efecto (useEffect):
       a. Suscribirse a cambios en el media query (addEventListener 'change').
       b. Actualizar estado cuando cambie.
       c. Cleanup: Remover listener.
    3. Retornar valor actual.
*/
```
