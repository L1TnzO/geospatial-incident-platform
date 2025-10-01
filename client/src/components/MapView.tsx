import { MapContainer, TileLayer } from 'react-leaflet'
import { useMapStore } from '@/store/useMapStore'
import '@/lib/leaflet'

const MapView = () => {
  const { center, zoom } = useMapStore()

  return (
    <section className="map-card" aria-label="Incident map">
      <MapContainer center={center} zoom={zoom} className="map-container">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </MapContainer>
    </section>
  )
}

export default MapView
