import { useMemo, useState, useEffect } from 'react';
import { LayerGroup, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { ObsoleteInfrastructure } from '../../types';

interface ObsoleteInfrastructureLayerProps {
    infrastructure: ObsoleteInfrastructure[];
    isVisible: boolean;
}

/**
 * Calculate infrastructure icon size based on zoom level.
 * Invisible at country-level (zoom < 10), visible at city-level (zoom >= 10).
 * Scales from 28px at zoom 10 to 44px at zoom 15+.
 */
const getZoomBasedSize = (zoom: number): number => {
    const minZoom = 10;
    const maxZoom = 15;
    const minSize = 28;
    const maxSize = 44;

    if (zoom < minZoom) return 0; // Invisible
    if (zoom >= maxZoom) return maxSize;

    const normalizedZoom = (zoom - minZoom) / (maxZoom - minZoom);
    return Math.round(minSize + (maxSize - minSize) * normalizedZoom);
};

const createInfraIcon = (status: string, size: number) => {
    const isBurned = status === 'BURNED';
    const fontSize = Math.round(size * 0.7); // Font size ~70% of icon size
    const fireSize = Math.round(size * 0.35); // Fire emoji smaller
    const html = isBurned
        ? `<div class="infra-marker infra-marker--burned">
            <span class="infra-marker__building" style="font-size: ${fontSize}px">🏛️</span>
            <span class="infra-marker__fire" style="font-size: ${fireSize}px">🔥</span>
           </div>`
        : `<div class="infra-marker">
            <span class="infra-marker__building" style="font-size: ${fontSize}px">🏛️</span>
           </div>`;

    return L.divIcon({
        html,
        className: 'infra-marker-container',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2 - 2],
    });
};

const ObsoleteInfrastructureLayer = ({ infrastructure, isVisible }: ObsoleteInfrastructureLayerProps) => {
    const map = useMap();
    const [zoom, setZoom] = useState(map.getZoom());

    useEffect(() => {
        const handleZoom = () => setZoom(map.getZoom());
        map.on('zoomend', handleZoom);
        return () => { map.off('zoomend', handleZoom); };
    }, [map]);

    const size = getZoomBasedSize(zoom);
    const activeIcon = useMemo(() => createInfraIcon('ACTIVE', size), [size]);
    const burnedIcon = useMemo(() => createInfraIcon('BURNED', size), [size]);

    // Don't render if not visible or zoomed out too far
    if (!isVisible || size === 0) {
        return null;
    }

    return (
        <LayerGroup>
            {infrastructure.map((infra) => {
                const { lat, lng } = infra.location;
                if (typeof lat !== 'number' || typeof lng !== 'number') {
                    return null;
                }

                const icon = infra.status === 'BURNED' ? burnedIcon : activeIcon;

                return (
                    <Marker
                        key={infra.id}
                        position={{ lat, lng }}
                        icon={icon}
                        title={`${infra.description || 'Infrastructure'} (${infra.status})`}
                    >
                        <Popup className="station-popup__container">
                            <div className="station-popup">
                                <h3 className="station-popup__title">Obsolete Infrastructure</h3>
                                <dl className="station-popup__meta">
                                    <div>
                                        <dt>Code</dt>
                                        <dd>{infra.id}</dd>
                                    </div>
                                    <div>
                                        <dt>Description</dt>
                                        <dd>{infra.description}</dd>
                                    </div>
                                    <div>
                                        <dt>Status</dt>
                                        <dd>{infra.status}</dd>
                                    </div>
                                    {infra.incidentNumber && (
                                        <div>
                                            <dt>Linked Incident</dt>
                                            <dd>{infra.incidentNumber}</dd>
                                        </div>
                                    )}
                                </dl>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </LayerGroup>
    );
};

export default ObsoleteInfrastructureLayer;

