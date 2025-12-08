import { get, set } from 'idb-keyval';
import { apiClient } from './api-client';
import { mapIncidentToUi } from './incidents';
import type { LiteIncident } from '../types';
import type { IncidentListResponse, IncidentSyncStatus } from '../types/api/incidents';

const DB_KEY_INCIDENTS = 'incidents-repository-data';
const DB_KEY_SYNC_STATUS = 'incidents-repository-sync-status';

class IncidentRepository {
    private static instance: IncidentRepository;
    private incidents: Map<string, LiteIncident> = new Map();
    private syncStatus: IncidentSyncStatus | null = null;
    private listeners: Set<() => void> = new Set();
    private isInitialized = false;
    private syncPromise: Promise<void> | null = null;

    private constructor() { }

    public static getInstance(): IncidentRepository {
        if (!IncidentRepository.instance) {
            IncidentRepository.instance = new IncidentRepository();
        }
        return IncidentRepository.instance;
    }

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach((listener) => listener());
    }

    public getIncidents(): LiteIncident[] {
        return Array.from(this.incidents.values()).sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    }

    public getQuery(filters: {
        startDate?: string;
        endDate?: string;
        isActive?: boolean | undefined; // undefined means ALL
    }): LiteIncident[] {
        const all = this.getIncidents();

        return all.filter(incident => {
            // Date Filter
            if (filters.startDate && new Date(incident.date) < new Date(filters.startDate)) return false;
            if (filters.endDate && new Date(incident.date) > new Date(filters.endDate)) return false;

            // Active Filter (Strict check: if undefined, allow all. If true/false, match exactly)
            if (filters.isActive !== undefined && incident.isActive !== filters.isActive) return false;

            return true;
        });
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Load from IDB
            const storedIncidents = await get<LiteIncident[]>(DB_KEY_INCIDENTS);
            const storedStatus = await get<IncidentSyncStatus>(DB_KEY_SYNC_STATUS);

            if (storedIncidents) {
                this.incidents = new Map(storedIncidents.map(i => [i.id, i]));
            }
            if (storedStatus) {
                this.syncStatus = storedStatus;
            }

            this.isInitialized = true;
            this.notify();
        } catch (error) {
            console.error('[IncidentRepository] Failed to initialize:', error);
        }
    }

    public async sync(): Promise<void> {
        // Prevent double syncs
        if (this.syncPromise) return this.syncPromise;

        this.syncPromise = this.performSync().finally(() => {
            this.syncPromise = null;
        });
        return this.syncPromise;
    }

    private async performSync(): Promise<void> {
        if (!this.isInitialized) await this.initialize();

        try {
            // 1. Get Server Status
            const serverStatus = await apiClient.incidents.syncStatus({
                headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-store' }
            });

            if (!serverStatus) return;

            const localStatus = this.syncStatus;

            // 2. Compare Status
            if (!localStatus || serverStatus.lastModified !== localStatus.lastModified || serverStatus.count !== localStatus.count) {

                // Decide: Delta vs Full
                // If we have data and server count represents a small diff, could try delta.
                // For robustness in this MVP step, we will prioritize Delta if timestamps differ but count is close,
                // OR fallback to Full Fetch if counts deviate significantly or we have no data.

                let merged = false;

                if (localStatus && serverStatus.count >= localStatus.count) {
                    try {
                        // Try Delta
                        const delta = await apiClient.incidents.getDelta(localStatus.lastModified);
                        console.log(`[IncidentRepository] Processing Delta: ${delta.length} items`);

                        delta.forEach(item => {
                            if (item.deletedAt) {
                                this.incidents.delete(item.incidentNumber);
                            } else {
                                const mapped = mapIncidentToUi(item);
                                if (mapped) this.incidents.set(mapped.id, mapped);
                            }
                        });
                        merged = true;
                    } catch (e) {
                        console.warn('[IncidentRepository] Delta failed, falling back to full fetch', e);
                    }
                }

                if (!merged) {
                    // Full Fetch (Historical Limit)
                    // We must paginate because the server limits page size (likely 1000)
                    const now = new Date();
                    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

                    let page = 1;
                    const pageSize = 1000; // Safe limit below server max
                    let hasMore = true;
                    const allIncidents: LiteIncident[] = [];

                    while (hasMore) {
                        console.log(`[IncidentRepository] Full Sync: Fetching page ${page}`);
                        try {
                            const response: any = await apiClient.incidents.mapList({
                                startDate: oneYearAgo.toISOString(),
                                endDate: now.toISOString(),
                                pageSize,
                                page
                            });

                            if (response?.data && response.data.length > 0) {
                                const mapped = response.data.map(mapIncidentToUi).filter((i): i is LiteIncident => i !== null);

                                // Progressive rendering: Update and notify immediately
                                mapped.forEach(inc => this.incidents.set(inc.id, inc));
                                allIncidents.push(...mapped);
                                this.notify();

                                // Check pagination info if available, or infer from result size
                                if (response.pagination) {
                                    hasMore = response.pagination.hasNext;
                                } else {
                                    hasMore = response.data.length === pageSize;
                                }
                                page++;
                            } else {
                                hasMore = false;
                            }
                        } catch (err) {
                            console.error(`[IncidentRepository] Error fetching page ${page}`, err);
                            hasMore = false; // Abort on error to avoid infinite loop
                        }
                    }

                    if (allIncidents.length > 0) {
                        this.incidents = new Map(allIncidents.map(i => [i.id, i]));
                        console.log(`[IncidentRepository] Full Sync Complete. Total: ${this.incidents.size}`);
                    }
                }

                // 3. Update State & Persist
                this.syncStatus = serverStatus;
                await set(DB_KEY_INCIDENTS, Array.from(this.incidents.values()));
                await set(DB_KEY_SYNC_STATUS, this.syncStatus);
                this.notify();
            } else {
                console.log('[IncidentRepository] Sync: Up to date.');
            }

        } catch (error) {
            console.error('[IncidentRepository] Sync Error:', error);
        }
    }
}

export const incidentRepository = IncidentRepository.getInstance();
