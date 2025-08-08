import React, { useState, useEffect } from 'react';
import { Filter, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface FilterPanelProps {
  geoJsonData?: any;
  onFilterChange: (filteredData: any) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ geoJsonData, onFilterChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedZip, setSelectedZip] = useState<string>('all');
  const [availableFilters, setAvailableFilters] = useState<{
    districts: string[];
    zips: string[];
    properties: string[];
  }>({
    districts: [],
    zips: [],
    properties: [],
  });

  // Extract unique values for filter options
  useEffect(() => {
    if (!geoJsonData?.features) {
      setAvailableFilters({ districts: [], zips: [], properties: [] });
      return;
    }

    const districts = new Set<string>();
    const zips = new Set<string>();
    const properties = new Set<string>();

    geoJsonData.features.forEach((feature: any) => {
      const props = feature.properties || {};
      
      // Look for common property names that might contain district info
      const districtKeys = ['district', 'DISTRICT', 'District', 'district_name', 'DISTRICT_NAME'];
      const zipKeys = ['zip', 'ZIP', 'zipcode', 'ZIPCODE', 'postal_code', 'POSTAL_CODE'];
      
      districtKeys.forEach(key => {
        if (props[key] && typeof props[key] === 'string') {
          districts.add(props[key]);
        }
      });
      
      zipKeys.forEach(key => {
        if (props[key]) {
          zips.add(String(props[key]));
        }
      });
      
      // Collect all property keys for reference
      Object.keys(props).forEach(key => properties.add(key));
    });

    setAvailableFilters({
      districts: Array.from(districts).sort(),
      zips: Array.from(zips).sort(),
      properties: Array.from(properties).sort(),
    });
  }, [geoJsonData]);

  // Apply filters
  useEffect(() => {
    if (!geoJsonData?.features) {
      onFilterChange(null);
      return;
    }

    let filteredFeatures = geoJsonData.features;

    // Apply search filter
    if (searchTerm.trim()) {
      filteredFeatures = filteredFeatures.filter((feature: any) => {
        const props = feature.properties || {};
        return Object.values(props).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Apply district filter
    if (selectedDistrict !== 'all') {
      filteredFeatures = filteredFeatures.filter((feature: any) => {
        const props = feature.properties || {};
        const districtKeys = ['district', 'DISTRICT', 'District', 'district_name', 'DISTRICT_NAME'];
        return districtKeys.some(key => props[key] === selectedDistrict);
      });
    }

    // Apply ZIP filter
    if (selectedZip !== 'all') {
      filteredFeatures = filteredFeatures.filter((feature: any) => {
        const props = feature.properties || {};
        const zipKeys = ['zip', 'ZIP', 'zipcode', 'ZIPCODE', 'postal_code', 'POSTAL_CODE'];
        return zipKeys.some(key => String(props[key]) === selectedZip);
      });
    }

    const filteredGeoJson = {
      ...geoJsonData,
      features: filteredFeatures,
    };

    onFilterChange(filteredGeoJson);
  }, [geoJsonData, searchTerm, selectedDistrict, selectedZip, onFilterChange]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDistrict('all');
    setSelectedZip('all');
  };

  const hasActiveFilters = searchTerm.trim() || selectedDistrict !== 'all' || selectedZip !== 'all';

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filter Zones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search zones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* District Filter */}
        {availableFilters.districts.length > 0 && (
          <div className="space-y-2">
            <Label>District</Label>
            <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
              <SelectTrigger>
                <SelectValue placeholder="Select district" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                {availableFilters.districts.map(district => (
                  <SelectItem key={district} value={district}>
                    {district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* ZIP Filter */}
        {availableFilters.zips.length > 0 && (
          <div className="space-y-2">
            <Label>ZIP Code</Label>
            <Select value={selectedZip} onValueChange={setSelectedZip}>
              <SelectTrigger>
                <SelectValue placeholder="Select ZIP code" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ZIP Codes</SelectItem>
                {availableFilters.zips.map(zip => (
                  <SelectItem key={zip} value={zip}>
                    {zip}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Data Info */}
        {geoJsonData?.features && (
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Total zones: {geoJsonData.features.length}</p>
            {availableFilters.properties.length > 0 && (
              <details className="cursor-pointer">
                <summary className="hover:text-foreground">Available properties:</summary>
                <div className="mt-1 pl-2 text-xs">
                  {availableFilters.properties.slice(0, 10).map(prop => (
                    <div key={prop}>{prop}</div>
                  ))}
                  {availableFilters.properties.length > 10 && (
                    <div>... and {availableFilters.properties.length - 10} more</div>
                  )}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="outline" onClick={clearFilters} className="w-full">
            Clear Filters
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default FilterPanel;