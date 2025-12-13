MÓDULO store/incident-detail-store

IMPORTAR: zustand, persistence utils.

INTERFACE IncidentDetailStore:

- selectedIncident, isOpen.
- detailCache: Map<Id, Detail>. LRU-like max entries logic.
- Actions: open/close, cacheIncidentDetail, getIncidentDetail.

LOGIC:

- loadCache/persistCache: localStorage management with versioning.
- trimCache: Enforce MAX_ENTRIES (25), removing oldest from order array.

STORE useIncidentDetailStore:

- Implements cache trimming on add.
- Manages selection state.
- Persistence keys 'gip::incidentDetailCache::v1'.
