import { useEffect, useRef } from 'react';
import type { LiteIncident } from '../types';

export function useLocalWorker(incidents: LiteIncident[]) {
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        workerRef.current = new Worker(new URL('../workers/incident-worker.ts', import.meta.url), {
            type: 'module',
        });

        return () => {
            workerRef.current?.terminate();
            workerRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (workerRef.current && incidents.length > 0) {
            workerRef.current.postMessage({
                type: 'SET_DATA',
                payload: {
                    incidents,
                    filters: {}, // No client-side filtering for this worker
                },
            });
        }
    }, [incidents]);

    return workerRef.current;
}
