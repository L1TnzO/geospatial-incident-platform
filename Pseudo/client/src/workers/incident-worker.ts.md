MÓDULO workers/incident-worker

IMPORTAR: Supercluster, Types.

ESTADO GLOBAL (Worker Scope):

- cachedIncidents.
- filteredIncidents.
- clusterIndex (Supercluster instance).

MENSAJES:

- SET_DATA: Update cache, run initial filter, rebuild index.
- FILTER_DATA: Run filters on cache, rebuild index.
- GET_CLUSTERS: Query supercluster with bbox/zoom -> return ClusterEntry[].

LOGIC:

- filterIncidents: Array filtering logic (Date, Codes, Search).
- updateClusterIndex: Convert LatLng to GeoJSON Points -> load into Supercluster.
- onmessage listener loop.
