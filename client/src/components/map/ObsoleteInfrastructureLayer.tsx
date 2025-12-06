import { useMemo } from 'react';
import { LayerGroup, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { ObsoleteInfrastructure } from '../../types';

interface ObsoleteInfrastructureLayerProps {
    infrastructure: ObsoleteInfrastructure[];
    isVisible: boolean;
}

const createInfraIcon = (status: string) => {
    // Building emoji for all, with a small fire overlay for burned
    const isBurned = status === 'BURNED';
    const html = isBurned
        ? `<div class="infra-marker infra-marker--burned">
            <span class="infra-marker__building">🏛️</span>
            <span class="infra-marker__fire">🔥</span>
           </div>`
        : `<div class="infra-marker">
            <span class="infra-marker__building">🏛️</span>
           </div>`;

    return L.divIcon({
        html,
        className: 'infra-marker-container',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -22],
    });
};

const ObsoleteInfrastructureLayer = ({ infrastructure, isVisible }: ObsoleteInfrastructureLayerProps) => {
    const activeIcon = useMemo(() => createInfraIcon('ACTIVE'), []);
    const burnedIcon = useMemo(() => createInfraIcon('BURNED'), []);

    if (!isVisible) {
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
