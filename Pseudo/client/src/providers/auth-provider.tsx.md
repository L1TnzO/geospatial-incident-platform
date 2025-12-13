# client/src/providers/auth-provider.tsx

## Reference

Original File: [client/src/providers/auth-provider.tsx](client/src/providers/auth-provider.tsx)

## Summary

Proveedor de autenticación que implementa una lógica de login simulada (Mock) con credenciales predefinidas. Gestiona el estado del usuario conectado.

## Pseudocode

```typescript
/*
    Constantes
    - ADMIN_CREDENTIALS: admin/admin
    - VIEWER_CREDENTIALS: viewer/viewer
*/

/*
    Componente AuthProvider
    Propósito: Gestionar el estado de autenticación de la aplicación.
    
    Estado:
    - user: Objeto User o null.

    Funciones:
    - login(username, password):
      1. Verificar si coincide con ADMIN_CREDENTIALS -> setUser(admin, role: admin).
      2. Verificar si coincide con VIEWER_CREDENTIALS -> setUser(viewer, role: viewer).
      3. Si no, lanzar error de credenciales inválidas.
    
    - logout():
      1. Establecer user a null.

    Render:
    1. Proveer el contexto AuthContext con { user, isAuthenticated, login, logout }.
*/
```
