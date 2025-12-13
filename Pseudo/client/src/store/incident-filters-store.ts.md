MÓDULO store/incident-filters-store

IMPORTAR: zustand.

CONSTANTES: Defaults (Page 1, Size 25, active=true, Limit 100k).

INTERFACE IncidentFiltersState:

- page, pageSize, sort.
- Filter fields (dates, codes arrays, search term).
- Actions: setFilters (partial update with validation), reset.

LOGIC:

- Sanitization functions (clamp numbers, safe arrays, valid dates).
- Persistence to localStorage 'gip::incidentTableFilters::v3'.

STORE useIncidentFiltersStore:

- initialFilters loaded from storage.
- setFilters: Merges partial + Logic to reset page to 1 on filter change. Persists.
- reset: Restore defaults.
