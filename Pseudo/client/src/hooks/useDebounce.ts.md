# client/src/hooks/useDebounce.ts

## Reference

Original File: [client/src/hooks/useDebounce.ts](client/src/hooks/useDebounce.ts)

## Summary

Hook utilitario para retrasar la actualización de un valor hasta que el usuario deja de escribir/actuar (debounce).

## Pseudocode

```typescript
/*
    Hook useDebounce<T>(value, delay)
    
    1. Estado local: debouncedValue.
    2. Efecto:
       - Configurar setTimeout para actualizar el estado después de 'delay'.
       - Cleanup: Limpiar timeout anterior si 'value' cambia antes de completarse.
    3. Retornar debouncedValue.
*/
```
