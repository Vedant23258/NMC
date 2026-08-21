import { useEffect, useState } from 'react';
import { GeoJSON, MapContainer, TileLayer } from 'react-leaflet';
import type { GeoJsonObject } from 'geojson';
import 'leaflet/dist/leaflet.css';
import { Card } from '@/shared/ui/card';
import { LoadingPanel } from '@/shared/ui/state-panels';

// Ward 16 pilot: real road-network geometry received from NMC (converted from the
// official CAD/shapefile export). Every other ward still uses the interim
// hand-digitised placeholder noted on the GIS Layer Manager tab.
const WARD_16_CENTER: [number, number] = [14.4449, 79.9942];

export const WardMap = () => {
  const [roads, setRoads] = useState<GeoJsonObject>();
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch('/gis/ward-16-roads.geojson')
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load ward geometry');
        return response.json();
      })
      .then(setRoads)
      .catch(() => setLoadError(true));
  }, []);

  return (
    <Card
      title="Ward 16 Road Network (pilot)"
      description="Real geometry supplied by NMC for the Ward 16 pilot. Other wards remain on the interim hand-digitised placeholder until their shapefiles are received."
    >
      {loadError ? <p className="muted">Ward geometry failed to load.</p> : null}
      {!roads && !loadError ? <LoadingPanel label="Loading ward geometry..." /> : null}
      {roads ? (
        <div style={{ height: '22rem', borderRadius: '0.6rem', overflow: 'hidden' }}>
          <MapContainer center={WARD_16_CENTER} zoom={15} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <GeoJSON data={roads} style={{ color: '#0c7a70', weight: 3 }} />
          </MapContainer>
        </div>
      ) : null}
    </Card>
  );
};
