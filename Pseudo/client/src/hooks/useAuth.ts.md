# client/src/hooks/useAuth.ts

## Reference

Original File: [client/src/hooks/useAuth.ts](client/src/hooks/useAuth.ts)

## Summary

Hook simple para consumir el contexto de autenticación (AuthContext) de forma segura.

## Pseudocode

```typescript
/*
    Hook useAuth
    1. Consumir contexto con useContext(AuthContext).
    2. Si el contexto es undefined (fuera de provider), lanzar Error.
    3. Retornar contexto.
*/
```
