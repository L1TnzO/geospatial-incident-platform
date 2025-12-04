import type {
    IncidentDetail,
    IncidentListItem,
    IncidentMapListItem,
} from '../types/api/incidents';
import type {
    Incident,
    IncidentAssetSummary,
    IncidentNoteSummary,
    IncidentUnitSummary,
} from '../types';

type IncidentListLike = IncidentListItem | IncidentMapListItem;

const extractCoordinates = (incident: IncidentListLike) => {
    const coordinates = incident.location.geometry?.coordinates;
    if (!coordinates || coordinates.length < 2) {
        return undefined;
    }

    const [lng, lat] = coordinates;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
        return undefined;
    }

    return { lat, lng };
};

const resolveAddress = (incident: IncidentListLike) => {
    const properties = incident.location.properties as Record<string, unknown> | undefined;
    if (!properties) {
        return undefined;
    }

    const candidates = [
        properties.label,
        properties.name,
        properties.address,
        properties.addressLine,
        properties.formatted,
        properties.description,
    ];

    const value = candidates.find(
        (candidate) => typeof candidate === 'string' && candidate.length > 0,
    );
    return (value as string | undefined) ?? undefined;
};

export const mapIncidentToUi = (incident: IncidentListLike): Incident | null => {
    const coordinates = extractCoordinates(incident);
    if (!coordinates) {
        return null;
    }

    return {
        id: incident.incidentNumber,
        type: incident.type.name,
        typeCode: incident.type.code,
        severity: incident.severity.name,
        severityColor: incident.severity.colorHex,
        severityCode: incident.severity.code,
        date: incident.reportedAt,
        timestamp: incident.reportedAt,
        reportedAt: incident.reportedAt,
        occurrenceAt: incident.occurrenceAt,
        location: {
            lat: coordinates.lat,
            lng: coordinates.lng,
            address: resolveAddress(incident) ?? 'Location unavailable',
        },
        description: incident.title,
        responseTime: undefined,
        status: incident.status.name,
        statusCode: incident.status.code,
        zoneId: incident.primaryStation?.stationCode ?? undefined,
        isActive: incident.isActive,
    };
};

const mapUnitsToUi = (units: IncidentDetail['units']): IncidentUnitSummary[] =>
    units.map((unit) => ({
        stationCode: unit.stationCode,
        stationName: unit.stationName,
        assignmentRole: unit.assignmentRole ?? null,
        dispatchedAt: unit.dispatchedAt ?? null,
        clearedAt: unit.clearedAt ?? null,
    }));

const mapAssetsToUi = (assets: IncidentDetail['assets']): IncidentAssetSummary[] =>
    assets.map((asset) => ({
        assetIdentifier: asset.assetIdentifier,
        assetType: asset.assetType,
        status: asset.status ?? null,
        notes: asset.notes ?? null,
    }));

const mapNotesToUi = (notes: IncidentDetail['notes']): IncidentNoteSummary[] =>
    notes.map((note) => ({
        author: note.author,
        note: note.note,
        createdAt: note.createdAt,
    }));

export const mapIncidentDetailToUi = (incident: IncidentDetail): Incident | null => {
    const base = mapIncidentToUi(incident);
    if (!base) {
        return null;
    }

    return {
        ...base,
        narrative: incident.narrative ?? null,
        metadata: incident.metadata ?? {},
        units: mapUnitsToUi(incident.units),
        assets: mapAssetsToUi(incident.assets),
        notes: mapNotesToUi(incident.notes),
    };
};
