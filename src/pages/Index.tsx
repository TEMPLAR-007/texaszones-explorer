import React, { useState } from 'react';
import Header from '@/components/Header';
import FileUpload from '@/components/FileUpload';
import MapContainer from '@/components/MapContainer';
import FilterPanel from '@/components/FilterPanel';

const Index = () => {
  const [originalGeoJson, setOriginalGeoJson] = useState<any>(null);
  const [filteredGeoJson, setFilteredGeoJson] = useState<any>(null);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);

  const handleGeoJsonLoaded = (geoJson: any) => {
    setOriginalGeoJson(geoJson);
    setFilteredGeoJson(geoJson);
  };

  const handleFilterChange = (filteredData: any) => {
    setFilteredGeoJson(filteredData);
  };

  const handleFeatureClick = (feature: any) => {
    setSelectedFeature(feature);
  };

  const displayedGeoJson = filteredGeoJson || originalGeoJson;
  const zoneCount = displayedGeoJson?.features?.length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Header zoneCount={zoneCount} />
      
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)]">
          {/* Left Sidebar - Controls */}
          <div className="lg:col-span-1 space-y-6">
            <FileUpload onGeoJsonLoaded={handleGeoJsonLoaded} />
            <FilterPanel 
              geoJsonData={originalGeoJson} 
              onFilterChange={handleFilterChange} 
            />
            
            {/* Selected Feature Info */}
            {selectedFeature && (
              <div className="bg-card border border-border rounded-lg p-4 shadow-soft">
                <h3 className="font-semibold mb-2">Selected Zone</h3>
                <div className="text-sm space-y-1">
                  {Object.entries(selectedFeature.properties || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground">{key}:</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Main Content - Map */}
          <div className="lg:col-span-3">
            {displayedGeoJson ? (
              <MapContainer 
                geoJsonData={displayedGeoJson}
                onFeatureClick={handleFeatureClick}
              />
            ) : (
              <div className="h-full bg-card border border-border rounded-lg flex items-center justify-center text-center p-8">
                <div>
                  <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Ready to Explore Texas School Zones</h3>
                  <p className="text-muted-foreground max-w-md">
                    Upload your shapefile components (.shp, .dbf, .shx) to visualize elementary school zones 
                    and begin your marketing analysis.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
