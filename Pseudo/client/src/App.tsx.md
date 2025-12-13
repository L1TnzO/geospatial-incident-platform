# client/src/App.tsx

## Reference

Original File: [client/src/App.tsx](client/src/App.tsx)

## Summary

Componente raíz de la aplicación que configura el enrutamiento (React Router), los proveedores de contexto globales (Query, Auth, Incidents) y la estructura principal del layout. Gestiona la lógica de autenticación y la renderización condicional de páginas basadas en el rol del usuario y el dispositivo.

## Pseudocode

```typescript
/*
    Funciones Helper
    - AppRoutes: Componente interno que define las rutas (Switch/Routes).
      - Hooks: useAuth, useIncidentFiltersStore, useIncidentsContext, etc.
      - Estado local: showLogin (modal de login).
      - Render:
        - Si showLogin es true, mostrar LoginScreen.
        - Navbar (MainNavigation).
        - Rutas:
          - /map: Vista principal de mapa (MapView) con sidebar.
          - /table: Vista tabular (TableView) si no es móvil y usuario logueado.
          - /dashboard: Dashboard operativo (DashboardPage).
          - /strategic: Análisis estratégico (StrategicPage).
          - /consolidated-report: Reporte imprimible.
          - /report: Página de creación de incidentes (solo admin).
          - *: Redirección a /map.
        - Modales globales: IncidentDetailModal, IncidentCreateDrawer, Toaster.
*/

/*
    Componente App (Export default)
    
    Render:
    1. QueryProvider (React Query).
       2. AuthProvider (Contexto de usuario).
          3. IncidentsProvider (Datos globales de incidentes).
             4. AppRoutes (Navegación).
*/
```
