import { useEffect } from 'react';
import { MapContainer, TileLayer, useMapEvents, Marker, useMap } from 'react-leaflet';
import { useIncidentCreateStore } from '../store/incident-create-store';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para el icono de leaflet
const customIcon = new Icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

// --- NUEVO: Componente que vigila el tamaño de la ventana ---
const MapResizeHandler = () => {
    const map = useMap();

    useEffect(() => {
        const container = map.getContainer();
        const observer = new ResizeObserver(() => {
            // Esta función le dice a Leaflet: "¡Oye, el div cambió de tamaño, recalcula los tiles!"
            map.invalidateSize();
        });

        observer.observe(container);

        // Forzar una actualización inicial rápida por si acaso
        setTimeout(() => {
            map.invalidateSize();
        }, 100);

        return () => {
            observer.disconnect();
        };
    }, [map]);

    return null;
};

function LocationMarker() {
    const { coordinates, setCoordinates } = useIncidentCreateStore();

    useMapEvents({
        click(e) {
            setCoordinates({ lat: e.latlng.lat, lng: e.latlng.lng });
        },
    });

    return coordinates ? (
        <Marker position={[coordinates.lat, coordinates.lng]} icon={customIcon} />
    ) : null;
}

export function LocationPickerMap() {
    // Centro por defecto (Santiago)
    const center = { lat: -33.4489, lng: -70.6693 };

    return (
        <MapContainer
            center={center}
            zoom={12}
            style={{ height: '100%', width: '100%', minHeight: '300px' }}
            className="w-full h-full rounded-b-lg outline-none z-0" // z-0 ayuda a que no tape otros elementos
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
            />
            <LocationMarker />

            {/* --- IMPORTANTE: Agregamos el vigilante aquí --- */}
            <MapResizeHandler />
        </MapContainer>
    );
}