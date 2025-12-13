# client/src/hooks/useLocalWorker.ts

## Reference

Original File: [client/src/hooks/useLocalWorker.ts](client/src/hooks/useLocalWorker.ts)

## Summary

Hook que instancia y gestiona un Web Worker dedicado para procesar datos de incidentes (filtrado pesado fuera del hilo principal).

## Pseudocode

```typescript
/*
    Hook useLocalWorker(incidents)
    
    1. Instanciar Worker (incident-worker.ts) al montar.
    2. Terminar worker al desmontar.
    3. Efecto: Cuando cambian los incidentes, enviar mensaje 'SET_DATA' al worker.
    
    Retorna instancia del worker.
*/
```
