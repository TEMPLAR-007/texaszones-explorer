import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card } from '@/components/ui/card';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapContainerProps {
  geoJsonData?: any;
  onFeatureClick?: (feature: any) => void;
}

const MapContainer: React.FC<MapContainerProps> = ({ geoJsonData, onFeatureClick }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map centered on Texas
    const map = L.map(mapRef.current, {
      center: [31.0, -100.0], // Texas center
      zoom: 6,
      zoomControl: true,
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !geoJsonData) return;

    // Remove existing layer
    if (geoJsonLayerRef.current) {
      mapInstanceRef.current.removeLayer(geoJsonLayerRef.current);
    }

    // Add new GeoJSON layer
    const layer = L.geoJSON(geoJsonData, {
      style: {
        color: 'hsl(211, 84%, 32%)',
        weight: 2,
        opacity: 0.8,
        fillColor: 'hsl(174, 44%, 51%)',
        fillOpacity: 0.3,
      },
      onEachFeature: (feature, layer) => {
        // Add popup with feature properties
        const properties = feature.properties || {};
        const popupContent = Object.entries(properties)
          .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
          .join('<br>');
        
        layer.bindPopup(popupContent);
        
        // Add click handler
        layer.on('click', () => {
          onFeatureClick?.(feature);
        });

        // Add hover effects
        layer.on('mouseover', function(e) {
          const layer = e.target;
          layer.setStyle({
            weight: 3,
            fillOpacity: 0.5,
          });
        });

        layer.on('mouseout', function(e) {
          const layer = e.target;
          layer.setStyle({
            weight: 2,
            fillOpacity: 0.3,
          });
        });
      },
    });

    layer.addTo(mapInstanceRef.current);
    geoJsonLayerRef.current = layer;

    // Fit map to layer bounds
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [geoJsonData, onFeatureClick]);

  return (
    <Card className="h-full p-0 overflow-hidden">
      <div ref={mapRef} className="h-full w-full map-container" />
    </Card>
  );
};

export default MapContainer;