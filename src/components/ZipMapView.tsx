import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface ZipMapViewProps {
  zipCode: string;
  zipData: any;
  geoJsonData?: any;
}

const ZipMapView: React.FC<ZipMapViewProps> = ({ zipCode, zipData, geoJsonData }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
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
    if (!mapInstanceRef.current || !geoJsonData || !zipCode) return;

    // Remove existing layer and label
    if (geoJsonLayerRef.current) {
      mapInstanceRef.current.removeLayer(geoJsonLayerRef.current);
    }
    if (mapInstanceRef.current.zipLabelMarker) {
      mapInstanceRef.current.removeLayer(mapInstanceRef.current.zipLabelMarker);
      mapInstanceRef.current.zipLabelMarker = null;
    }

    // Filter GeoJSON data for the selected ZIP code
    const filteredFeatures = geoJsonData.features.filter((feature: any) => {
      const props = feature.properties || {};
      const zip = props.Zip || props.ZIP || props.zipcode;
      return zip === zipCode;
    });

    if (filteredFeatures.length === 0) return;

    const filteredGeoJson = {
      ...geoJsonData,
      features: filteredFeatures,
    };

    // Add new GeoJSON layer
    const layer = L.geoJSON(filteredGeoJson, {
      style: {
        color: 'hsl(211, 84%, 32%)',
        weight: 3,
        opacity: 0.9,
        fillColor: 'hsl(174, 44%, 51%)',
        fillOpacity: 0.6,
      },
      onEachFeature: (feature, layer) => {
        const properties = feature.properties || {};

        // Create detailed popup with processed summary
        const popupContent = `
          <div style="font-family: system-ui; max-width: 300px;">
            <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px; font-weight: bold;">
              ZIP Code ${zipCode}
            </h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
              <div style="background: #dcfce7; padding: 8px; border-radius: 4px; text-align: center;">
                <div style="font-size: 20px; font-weight: bold; color: #16a34a;">${zipData.totalStudents}</div>
                <div style="font-size: 12px; color: #6b7280;">Total Population</div>
              </div>
              <div style="background: #dbeafe; padding: 8px; border-radius: 4px; text-align: center;">
                <div style="font-size: 18px; font-weight: bold; color: #1d4ed8;">${zipData.processedTotals?.get('Schl_Cn') || 0}</div>
                <div style="font-size: 11px; color: #6b7280;">Schools</div>
              </div>
              <div style="background: #fef3c7; padding: 8px; border-radius: 4px; text-align: center;">
                <div style="font-size: 18px; font-weight: bold; color: #d97706;">${zipData.count}</div>
                <div style="font-size: 11px; color: #6b7280;">Records</div>
              </div>
              <div style="background: #f3e8ff; padding: 8px; border-radius: 4px; text-align: center;">
                <div style="font-size: 18px; font-weight: bold; color: #7c3aed;">
                  ${zipData.totalStudents > 0 && zipData.processedTotals?.get('Schl_Cn') > 0
            ? Math.round(zipData.totalStudents / zipData.processedTotals.get('Schl_Cn'))
            : 0}
                </div>
                <div style="font-size: 11px; color: #6b7280;">Avg/School</div>
              </div>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 8px;">
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;"><strong>Grade Levels:</strong></div>
              <div style="font-size: 11px; color: #374151;">
                Pre-K: ${zipData.processedTotals?.get('Pre_K') || 0} | 
                KG: ${zipData.processedTotals?.get('KG') || 0} | 
                Grade 1-3: ${(zipData.processedTotals?.get('Grade_1') || 0) + (zipData.processedTotals?.get('Grade_2') || 0) + (zipData.processedTotals?.get('Grade_3') || 0)}
              </div>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px;">
              <div style="font-size: 11px; color: #6b7280;">
                <strong>School Count:</strong> ${zipData.processedTotals?.get('Schl_Cn') || 0}<br>
                <strong>Student Ratio:</strong> ${zipData.processedTotals?.get('Stdnt_R') || 0}
              </div>
            </div>
          </div>
        `;

        layer.bindPopup(popupContent, {
          maxWidth: 320,
          className: 'zip-popup'
        });

        // Add hover effects
        layer.on('mouseover', function (e) {
          const layer = e.target;
          layer.setStyle({
            weight: 4,
            fillOpacity: 0.8,
          });
        });

        layer.on('mouseout', function (e) {
          const layer = e.target;
          layer.setStyle({
            weight: 3,
            fillOpacity: 0.6,
          });
        });
      },
    });

    layer.addTo(mapInstanceRef.current);
    geoJsonLayerRef.current = layer;

    // Add labels directly on the map
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      const center = bounds.getCenter();

      // Create a custom HTML marker with key statistics
      const labelHtml = `
        <div style="
          background: rgba(255, 255, 255, 0.95);
          border: 2px solid hsl(211, 84%, 32%);
          border-radius: 8px;
          padding: 8px 12px;
          font-family: system-ui;
          font-size: 12px;
          font-weight: bold;
          color: #1f2937;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          min-width: 120px;
        ">
          <div style="color: hsl(211, 84%, 32%); font-size: 14px; margin-bottom: 4px;">ZIP ${zipCode}</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 10px;">
            <div style="color: #16a34a;">${zipData.totalStudents} Students</div>
            <div style="color: #ea580c;">${zipData.processedTotals?.get('Schl_Cn') || 0} Schools</div>
          </div>
          <div style="font-size: 9px; color: #6b7280; margin-top: 2px;">
            Total Population: ${zipData.totalStudents}
          </div>
        </div>
      `;

      const labelIcon = L.divIcon({
        html: labelHtml,
        className: 'zip-label-marker',
        iconSize: [120, 60],
        iconAnchor: [60, 30]
      });

      const labelMarker = L.marker(center, { icon: labelIcon }).addTo(mapInstanceRef.current);

      // Store reference to remove later
      if (!mapInstanceRef.current.zipLabelMarker) {
        mapInstanceRef.current.zipLabelMarker = labelMarker;
      }
    }

    layer.addTo(mapInstanceRef.current);
    geoJsonLayerRef.current = layer;

    // Fit map to layer bounds
    const layerBounds = layer.getBounds();
    if (layerBounds.isValid()) {
      mapInstanceRef.current.fitBounds(layerBounds, {
        padding: [20, 20],
        maxZoom: 12 // Don't zoom in too much
      });
    }
  }, [geoJsonData, zipCode, zipData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          ZIP Code {zipCode} - Geographic View
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={mapRef} className="h-96 w-full" />
      </CardContent>
    </Card>
  );
};

export default ZipMapView;