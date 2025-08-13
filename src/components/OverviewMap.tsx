import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Search, X, BarChart3, Eye, Calculator } from 'lucide-react';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface OverviewMapProps {
    geoJsonData?: any;
    onZipSelect?: (zipCode: string) => void;
}

const OverviewMap: React.FC<OverviewMapProps> = ({ geoJsonData, onZipSelect }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);

    // Multi-select state
    const [selectedZips, setSelectedZips] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAggregatedView, setShowAggregatedView] = useState(false);

    // Performance optimization state
    const [currentZoom, setCurrentZoom] = useState(6);
    const [showLabels, setShowLabels] = useState(false);
    const [performanceMode, setPerformanceMode] = useState<'high' | 'medium' | 'low'>('medium');

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

        // Add zoom and move event listeners for performance optimization
        map.on('zoomend', () => {
            const zoom = map.getZoom();
            setCurrentZoom(zoom);

            // Smart label showing based on performance mode and zoom
            const thresholds = {
                high: 11,    // Only at very high zoom
                medium: 10,  // Medium zoom
                low: 9       // Lower zoom (current)
            };
            setShowLabels(zoom >= thresholds[performanceMode]);
        });

        map.on('moveend', () => {
            // Could implement viewport-based loading here
            console.log('Map moved, current bounds:', map.getBounds());
        });

        mapInstanceRef.current = map;

        return () => {
            map.remove();
        };
    }, []);

    // Process ZIP summaries for search and aggregation (optimized)
    const zipSummaries = useMemo(() => {
        if (!geoJsonData?.features) return new Map();

        const summaries = new Map();
        const batchSize = 1000; // Process in batches to avoid blocking UI

        // Use requestIdleCallback for non-blocking processing
        const processFeatures = (features: any[]) => {
            for (let i = 0; i < features.length; i += batchSize) {
                const batch = features.slice(i, i + batchSize);

                batch.forEach((feature: any) => {
                    const props = feature.properties || {};
                    const zip = props.Zip || props.ZIP || props.zipcode;

                    if (!zip) return;

                    if (!summaries.has(zip)) {
                        summaries.set(zip, {
                            zip,
                            totalStudents: 0,
                            totalPopulation: 0,
                            totalFemale: 0,
                            totalMale: 0,
                            count: 0,
                            schools: 0,
                            features: [],
                            processedTotals: new Map()
                        });
                    }

                    const zipInfo = summaries.get(zip);
                    zipInfo.features.push(feature);
                    zipInfo.count++;

                    // Optimize numeric parsing with correct field names
                    const female = +(props.Female || 0);
                    const male = +(props.Male || 0);
                    const totalStudents = female + male; // Calculate from actual student counts
                    const population = +(props.pop || 0);

                    zipInfo.totalFemale += female;
                    zipInfo.totalMale += male;
                    zipInfo.totalStudents += totalStudents;
                    zipInfo.totalPopulation += population;
                    zipInfo.schools += +(props.Schl_Cn || 0);

                    // Only process essential numeric fields for performance
                    const essentialFields = ['Pre_K', 'KG', 'Grade_1', 'Grade_2', 'Grade_3', 'Stdnt_R'];
                    essentialFields.forEach(key => {
                        const numValue = +(props[key] || 0);
                        if (numValue >= 0) {
                            if (!zipInfo.processedTotals.has(key)) {
                                zipInfo.processedTotals.set(key, 0);
                            }
                            zipInfo.processedTotals.set(key, zipInfo.processedTotals.get(key) + numValue);
                        }
                    });
                });
            }
        };

        processFeatures(geoJsonData.features);
        return summaries;
    }, [geoJsonData]);

    // Filter ZIP codes based on search term
    const filteredZips = useMemo(() => {
        if (!searchTerm.trim()) return Array.from(zipSummaries.keys());

        const searchLower = searchTerm.toLowerCase();
        return Array.from(zipSummaries.keys()).filter(zip =>
            zip.toLowerCase().includes(searchLower)
        );
    }, [zipSummaries, searchTerm]);

    // Calculate aggregated data for selected ZIPs
    const aggregatedData = useMemo(() => {
        if (selectedZips.length === 0) return null;

        const aggregated = {
            zips: selectedZips,
            totalStudents: 0,
            totalPopulation: 0,
            totalFemale: 0,
            totalMale: 0,
            totalRecords: 0,
            totalSchools: 0,
            processedTotals: new Map()
        };

        selectedZips.forEach(zip => {
            const zipData = zipSummaries.get(zip);
            if (zipData) {
                aggregated.totalStudents += zipData.totalStudents;
                aggregated.totalPopulation += zipData.totalPopulation;
                aggregated.totalFemale += zipData.totalFemale;
                aggregated.totalMale += zipData.totalMale;
                aggregated.totalRecords += zipData.count;
                aggregated.totalSchools += Math.round(zipData.schools / zipData.count) || 0;

                // Aggregate processed totals
                zipData.processedTotals.forEach((value, key) => {
                    if (!aggregated.processedTotals.has(key)) {
                        aggregated.processedTotals.set(key, 0);
                    }
                    aggregated.processedTotals.set(key, aggregated.processedTotals.get(key) + value);
                });
            }
        });

        return aggregated;
    }, [selectedZips, zipSummaries]);

    useEffect(() => {
        if (!mapInstanceRef.current || !geoJsonData) return;

        // Remove existing layer and labels
        if (geoJsonLayerRef.current) {
            mapInstanceRef.current.removeLayer(geoJsonLayerRef.current);
        }

        // Remove existing ZIP labels
        if ((mapInstanceRef.current as any).zipLabelMarkers) {
            (mapInstanceRef.current as any).zipLabelMarkers.forEach((marker: L.Marker) => {
                mapInstanceRef.current.removeLayer(marker);
            });
            (mapInstanceRef.current as any).zipLabelMarkers = [];
        }

        if (zipSummaries.size === 0) {
            return;
        }

        // Add GeoJSON layer with all ZIP codes
        const layer = L.geoJSON(geoJsonData, {
            style: (feature) => {
                const props = feature?.properties || {};
                const zip = props.Zip || props.ZIP || props.zipcode;
                const zipInfo = zipSummaries.get(zip);
                const isSelected = selectedZips.includes(zip);

                // Color based on selection and population size
                let fillColor = '#94a3b8'; // default gray
                if (zipInfo && zipInfo.totalStudents > 0) {
                    if (zipInfo.totalStudents > 5000) fillColor = '#dc2626'; // red for high
                    else if (zipInfo.totalStudents > 3000) fillColor = '#ea580c'; // orange
                    else if (zipInfo.totalStudents > 1000) fillColor = '#d97706'; // amber
                    else fillColor = '#16a34a'; // green for low
                }

                return {
                    color: isSelected ? '#7c3aed' : 'hsl(211, 84%, 32%)',
                    weight: isSelected ? 4 : 2,
                    opacity: 1,
                    fillColor: isSelected ? '#a855f7' : fillColor,
                    fillOpacity: isSelected ? 0.8 : 0.6,
                };
            },
            onEachFeature: (feature, layer) => {
                const props = feature.properties || {};
                const zip = props.Zip || props.ZIP || props.zipcode;
                const zipInfo = zipSummaries.get(zip);

                if (!zipInfo) {
                    return;
                }

                // Add ZIP code label with performance optimization
                if (showLabels && feature.geometry) {
                    // Performance limits based on mode
                    const maxLabels = {
                        high: 50,
                        medium: 100,
                        low: 200
                    };

                    // Count existing labels
                    const existingLabels = (mapInstanceRef.current as any).zipLabelMarkers?.length || 0;
                    if (existingLabels >= maxLabels[performanceMode]) {
                        return; // Skip this label to maintain performance
                    }
                    // Calculate centroid of the polygon for label placement
                    const bounds = L.geoJSON(feature).getBounds();
                    const center = bounds.getCenter();

                    // Create a text label with semi-transparent background
                    const zipLabel = L.divIcon({
                        className: 'zip-label',
                        html: `<div style="
                            background: rgba(255, 255, 255, 0.7);
                            border: 1px solid rgba(0, 0, 0, 0.2);
                            border-radius: 3px;
                            padding: 1px 4px;
                            font-size: 11px;
                            font-weight: bold;
                            color: #1f2937;
                            text-align: center;
                            backdrop-filter: blur(2px);
                            pointer-events: none;
                        ">${zip}</div>`,
                        iconSize: [35, 16],
                        iconAnchor: [17, 8]
                    });

                    const marker = L.marker(center, { icon: zipLabel }).addTo(mapInstanceRef.current);

                    // Store marker for cleanup
                    if (!(mapInstanceRef.current as any).zipLabelMarkers) {
                        (mapInstanceRef.current as any).zipLabelMarkers = [];
                    }
                    (mapInstanceRef.current as any).zipLabelMarkers.push(marker);
                }

                // Add simple hover effects
                layer.on('mouseover', function (e) {
                    const layer = e.target;
                    const isSelected = selectedZips.includes(zip);
                    layer.setStyle({
                        weight: isSelected ? 5 : 3,
                        fillOpacity: 0.9,
                    });
                });

                layer.on('mouseout', function (e) {
                    const layer = e.target;
                    const isSelected = selectedZips.includes(zip);
                    layer.setStyle({
                        weight: isSelected ? 4 : 2,
                        fillOpacity: isSelected ? 0.8 : 0.6,
                    });
                });

                // Add click handler for multi-selection (single click only)
                layer.on('click', (e) => {
                    e.originalEvent.stopPropagation();

                    console.log('🖱️ ZIP clicked for multi-selection:', zip);

                    // Use functional update to get current state
                    setSelectedZips(currentSelected => {
                        if (currentSelected.includes(zip)) {
                            // Remove from selection
                            console.log('Removing ZIP:', zip);
                            return currentSelected.filter(z => z !== zip);
                        } else {
                            // Add to selection
                            console.log('Adding ZIP:', zip);
                            return [...currentSelected, zip];
                        }
                    });
                });

                // Disable double-click to prevent zoom behavior
                layer.on('dblclick', (e) => {
                    e.originalEvent.stopPropagation();
                    e.originalEvent.preventDefault();
                    // Do nothing on double-click - prevents map zoom
                });
            }
        });

        layer.addTo(mapInstanceRef.current);
        geoJsonLayerRef.current = layer;

        // Labels disabled for performance - use popups instead
        // Users can click on ZIP areas to see detailed information

        // Fit map to show all data
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
            mapInstanceRef.current.fitBounds(bounds, {
                padding: [20, 20],
                maxZoom: 10 // Don't zoom in too much for overview
            });
        }

        // Add global function for popup button clicks
        (window as any).selectZip = (zipCode: string) => {
            if (onZipSelect) {
                onZipSelect(zipCode);
            }
        };

    }, [geoJsonData, onZipSelect, zipSummaries]);

    // Separate effect to update styles when selection changes (doesn't recreate layer)
    useEffect(() => {
        if (!geoJsonLayerRef.current) return;

        // Update styles for all features without recreating the layer
        geoJsonLayerRef.current.eachLayer((layer: any) => {
            if (layer.feature) {
                const props = layer.feature.properties || {};
                const zip = props.Zip || props.ZIP || props.zipcode;
                const zipInfo = zipSummaries.get(zip);
                const isSelected = selectedZips.includes(zip);

                // Color based on selection and population size
                let fillColor = '#94a3b8'; // default gray
                if (zipInfo && zipInfo.totalStudents > 0) {
                    if (zipInfo.totalStudents > 5000) fillColor = '#dc2626'; // red for high
                    else if (zipInfo.totalStudents > 3000) fillColor = '#ea580c'; // orange
                    else if (zipInfo.totalStudents > 1000) fillColor = '#d97706'; // amber
                    else fillColor = '#16a34a'; // green for low
                }

                layer.setStyle({
                    color: isSelected ? '#7c3aed' : 'hsl(211, 84%, 32%)',
                    weight: isSelected ? 4 : 2,
                    opacity: 1,
                    fillColor: isSelected ? '#a855f7' : fillColor,
                    fillOpacity: isSelected ? 0.8 : 0.6,
                });
            }
        });

    }, [selectedZips, zipSummaries]);

    if (!geoJsonData) {
        return null; // Don't show map if no data
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        Multi-ZIP Analysis
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search ZIP codes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        <Badge variant="outline" className="text-xs">
                            {zipSummaries.size} ZIPs loaded
                        </Badge>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSelectedZips([]);
                                setShowAggregatedView(false);
                            }}
                            disabled={selectedZips.length === 0}
                        >
                            Clear All
                        </Button>
                        {/* <Button
                            onClick={() => {
                                setShowAggregatedView(true);
                                // Zoom map to show only selected ZIP codes
                                if (geoJsonLayerRef.current && selectedZips.length > 0) {
                                    const selectedFeatures: any[] = [];
                                    geoJsonLayerRef.current.eachLayer((layer: any) => {
                                        if (layer.feature) {
                                            const props = layer.feature.properties || {};
                                            const zip = props.Zip || props.ZIP || props.zipcode;
                                            if (selectedZips.includes(zip)) {
                                                selectedFeatures.push(layer);
                                            }
                                        }
                                    });

                                    if (selectedFeatures.length > 0) {
                                        const group = new L.FeatureGroup(selectedFeatures);
                                        const bounds = group.getBounds();
                                        if (bounds.isValid() && mapInstanceRef.current) {
                                            mapInstanceRef.current.fitBounds(bounds, {
                                                padding: [50, 50],
                                                maxZoom: 12
                                            });
                                        }
                                    }
                                }
                            }}
                            disabled={selectedZips.length === 0}
                        >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Analyze ({selectedZips.length})
                        </Button> */}
                    </div>

                    {searchTerm && (
                        <div className="max-h-32 overflow-y-auto border rounded p-2">
                            <div className="flex flex-wrap gap-1">
                                {filteredZips.slice(0, 20).map(zip => {
                                    const isSelected = selectedZips.includes(zip);
                                    const zipData = zipSummaries.get(zip);
                                    return (
                                        <Badge
                                            key={zip}
                                            variant={isSelected ? "default" : "outline"}
                                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                            onClick={() => {
                                                if (isSelected) {
                                                    setSelectedZips(prev => prev.filter(z => z !== zip));
                                                } else {
                                                    setSelectedZips(prev => [...prev, zip]);
                                                }
                                            }}
                                        >
                                            {zip} ({zipData?.totalStudents || 0})
                                        </Badge>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {selectedZips.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-sm font-medium">Selected ZIP Codes ({selectedZips.length}):</div>
                            <div className="flex flex-wrap gap-1">
                                {selectedZips.map(zip => {
                                    const zipData = zipSummaries.get(zip);
                                    return (
                                        <Badge key={zip} variant="secondary" className="flex items-center gap-1">
                                            {zip} ({zipData?.totalStudents || 0})
                                            <X
                                                className="h-3 w-3 cursor-pointer hover:text-destructive"
                                                onClick={() => setSelectedZips(prev => prev.filter(z => z !== zip))}
                                            />
                                        </Badge>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Aggregated Analysis View */}
            {showAggregatedView && aggregatedData && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5" />
                                Aggregated Analysis - {selectedZips.length} ZIP Codes
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAggregatedView(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <p className="text-2xl font-bold text-blue-600">{aggregatedData.totalPopulation}</p>
                                <p className="text-sm text-muted-foreground">Population</p>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                <p className="text-2xl font-bold text-green-600">{aggregatedData.totalStudents}</p>
                                <p className="text-sm text-muted-foreground">Total Students</p>
                            </div>
                            <div className="text-center p-4 bg-purple-50 rounded-lg">
                                <p className="text-2xl font-bold text-purple-600">{aggregatedData.totalSchools}</p>
                                <p className="text-sm text-muted-foreground">Total Schools</p>
                            </div>
                            <div className="text-center p-4 bg-orange-50 rounded-lg">
                                <p className="text-2xl font-bold text-orange-600">
                                    {aggregatedData.totalSchools > 0
                                        ? Math.round(aggregatedData.totalStudents / aggregatedData.totalSchools)
                                        : 0
                                    }
                                </p>
                                <p className="text-sm text-muted-foreground">Avg Students/School</p>
                            </div>
                        </div>

                        {/* Detailed Tabs */}
                        <Tabs defaultValue="summary" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="summary">
                                    <Calculator className="h-4 w-4 mr-2" />
                                    Summary
                                </TabsTrigger>
                                <TabsTrigger value="breakdown">
                                    <BarChart3 className="h-4 w-4 mr-2" />
                                    Breakdown
                                </TabsTrigger>
                                <TabsTrigger value="comparison">
                                    <Eye className="h-4 w-4 mr-2" />
                                    Comparison
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="summary" className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="space-y-3">
                                        <h4 className="font-medium text-blue-600 border-b pb-1">Demographics</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span>Total Students:</span>
                                                <span className="font-bold">{aggregatedData.totalStudents}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Female:</span>
                                                <span className="font-medium">{aggregatedData.totalFemale}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Male:</span>
                                                <span className="font-medium">{aggregatedData.totalMale}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Gender Ratio (F:M):</span>
                                                <span className="font-medium">
                                                    {aggregatedData.totalMale > 0
                                                        ? (aggregatedData.totalFemale / aggregatedData.totalMale).toFixed(2)
                                                        : 'N/A'
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="font-medium text-green-600 border-b pb-1">Grade Levels</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span>Pre-K:</span>
                                                <span className="font-medium">{aggregatedData.processedTotals?.get('Pre_K') || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Kindergarten:</span>
                                                <span className="font-medium">{aggregatedData.processedTotals?.get('KG') || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Grade 1:</span>
                                                <span className="font-medium">{aggregatedData.processedTotals?.get('Grade_1') || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Grade 2:</span>
                                                <span className="font-medium">{aggregatedData.processedTotals?.get('Grade_2') || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Grade 3:</span>
                                                <span className="font-medium">{aggregatedData.processedTotals?.get('Grade_3') || 0}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="font-medium text-purple-600 border-b pb-1">School Data</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span>Total Schools:</span>
                                                <span className="font-medium">{aggregatedData.totalSchools}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Avg Students/School:</span>
                                                <span className="font-medium">
                                                    {aggregatedData.totalSchools > 0
                                                        ? Math.round(aggregatedData.totalStudents / aggregatedData.totalSchools)
                                                        : 0
                                                    }
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Data Records:</span>
                                                <span className="font-medium">{aggregatedData.totalRecords}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="breakdown" className="space-y-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Grade Level Distribution Chart */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm">Grade Level Distribution</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                {[
                                                    { label: 'Pre-K', key: 'Pre_K', color: '#ef4444' },
                                                    { label: 'Kindergarten', key: 'KG', color: '#f97316' },
                                                    { label: 'Grade 1', key: 'Grade_1', color: '#eab308' },
                                                    { label: 'Grade 2', key: 'Grade_2', color: '#22c55e' },
                                                    { label: 'Grade 3', key: 'Grade_3', color: '#3b82f6' },
                                                ].map(grade => {
                                                    const value = aggregatedData.processedTotals?.get(grade.key) || 0;
                                                    const percentage = aggregatedData.totalStudents > 0
                                                        ? (value / aggregatedData.totalStudents * 100).toFixed(1)
                                                        : '0';
                                                    const barWidth = aggregatedData.totalStudents > 0
                                                        ? (value / aggregatedData.totalStudents * 100)
                                                        : 0;

                                                    return (
                                                        <div key={grade.key} className="space-y-1">
                                                            <div className="flex justify-between text-sm">
                                                                <span className="font-medium">{grade.label}</span>
                                                                <span className="text-muted-foreground">{value} ({percentage}%)</span>
                                                            </div>
                                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                                <div
                                                                    className="h-2 rounded-full transition-all duration-300"
                                                                    style={{
                                                                        width: `${barWidth}%`,
                                                                        backgroundColor: grade.color
                                                                    }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Population vs Schools Distribution */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm">Population vs Schools</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center justify-center mb-4">
                                                <div className="relative w-32 h-32">
                                                    {/* Simple CSS Pie Chart */}
                                                    <div
                                                        className="w-full h-full rounded-full"
                                                        style={{
                                                            background: `conic-gradient(
                                                                #16a34a 0deg ${(aggregatedData.totalStudents / (aggregatedData.totalStudents + aggregatedData.totalSchools) * 360) || 0}deg,
                                                                #3b82f6 ${(aggregatedData.totalStudents / (aggregatedData.totalStudents + aggregatedData.totalSchools) * 360) || 0}deg 360deg
                                                            )`
                                                        }}
                                                    ></div>
                                                    <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                                                        <div className="text-center">
                                                            <div className="text-lg font-bold">{aggregatedData.totalStudents + aggregatedData.totalSchools}</div>
                                                            <div className="text-xs text-muted-foreground">Total</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                                        <span className="text-sm">Students</span>
                                                    </div>
                                                    <span className="text-sm font-medium">
                                                        {aggregatedData.totalStudents} ({((aggregatedData.totalStudents / (aggregatedData.totalStudents + aggregatedData.totalSchools) * 100) || 0).toFixed(1)}%)
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                                        <span className="text-sm">Schools</span>
                                                    </div>
                                                    <span className="text-sm font-medium">
                                                        {aggregatedData.totalSchools} ({((aggregatedData.totalSchools / (aggregatedData.totalStudents + aggregatedData.totalSchools) * 100) || 0).toFixed(1)}%)
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="mt-3 pt-2 border-t text-xs text-muted-foreground">
                                                <div className="flex justify-between">
                                                    <span>Students per School:</span>
                                                    <span className="font-medium">
                                                        {aggregatedData.totalSchools > 0
                                                            ? Math.round(aggregatedData.totalStudents / aggregatedData.totalSchools)
                                                            : 0
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* ZIP Code Performance Chart */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm">ZIP Code Performance Ranking</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                {selectedZips
                                                    .map(zip => ({
                                                        zip,
                                                        data: zipSummaries.get(zip)
                                                    }))
                                                    .filter(item => item.data)
                                                    .sort((a, b) => (b.data?.totalStudents || 0) - (a.data?.totalStudents || 0))
                                                    .slice(0, 10)
                                                    .map((item, index) => {
                                                        const maxStudents = Math.max(...selectedZips.map(z => zipSummaries.get(z)?.totalStudents || 0));
                                                        const barWidth = maxStudents > 0 ? (item.data!.totalStudents / maxStudents * 100) : 0;

                                                        return (
                                                            <div key={item.zip} className="space-y-1">
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="font-medium">#{index + 1} ZIP {item.zip}</span>
                                                                    <span className="text-muted-foreground">{item.data!.totalStudents} students</span>
                                                                </div>
                                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                                    <div
                                                                        className="h-2 rounded-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-300"
                                                                        style={{ width: `${barWidth}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Schools vs Students Scatter */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm">Schools vs Students Distribution</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="relative h-48 bg-white rounded border">
                                                {(() => {
                                                    // Get and sort data points by ZIP code
                                                    const dataPoints = selectedZips.map(zip => {
                                                        const zipData = zipSummaries.get(zip);
                                                        if (!zipData) return null;

                                                        const schools = Math.round(zipData.schools / zipData.count) || 0;
                                                        const students = zipData.totalStudents || 0;

                                                        return { zip, schools, students };
                                                    }).filter(Boolean).sort((a, b) => a.zip.localeCompare(b.zip));

                                                    if (dataPoints.length === 0) {
                                                        return (
                                                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                                                Select ZIP codes to see line chart
                                                            </div>
                                                        );
                                                    }

                                                    // Calculate scales - normalize both to same scale
                                                    const maxStudents = Math.max(...dataPoints.map(d => d.students));
                                                    const maxSchools = Math.max(...dataPoints.map(d => d.schools));

                                                    return (
                                                        <>
                                                            {/* Chart area */}
                                                            <div className="absolute inset-6">
                                                                {/* Grid lines */}
                                                                <div className="absolute inset-0 pointer-events-none">
                                                                    {[25, 50, 75].map(y => (
                                                                        <div key={y} className="absolute w-full h-px bg-gray-200" style={{ top: `${y}%` }}></div>
                                                                    ))}
                                                                </div>

                                                                {/* Students Line */}
                                                                {dataPoints.map((point, index) => {
                                                                    const x = (index / (dataPoints.length - 1 || 1)) * 100;
                                                                    const studentY = maxStudents > 0 ? (100 - (point.students / maxStudents * 80)) : 50;

                                                                    return (
                                                                        <React.Fragment key={`student-${point.zip}`}>
                                                                            {/* Student Line Point */}
                                                                            <div
                                                                                className="absolute w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-md hover:bg-blue-600 hover:scale-125 transition-all cursor-pointer z-10"
                                                                                style={{
                                                                                    left: `${x}%`,
                                                                                    top: `${studentY}%`,
                                                                                    transform: 'translate(-50%, -50%)'
                                                                                }}
                                                                                title={`ZIP ${point.zip}: ${point.students} students`}
                                                                            >
                                                                                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-bold text-blue-700 opacity-0 hover:opacity-100 transition-opacity bg-white px-2 py-1 rounded shadow whitespace-nowrap">
                                                                                    {point.students}
                                                                                </div>
                                                                            </div>

                                                                            {/* Connect student line points */}
                                                                            {index < dataPoints.length - 1 && (() => {
                                                                                const nextPoint = dataPoints[index + 1];
                                                                                const nextX = ((index + 1) / (dataPoints.length - 1 || 1)) * 100;
                                                                                const nextStudentY = maxStudents > 0 ? (100 - (nextPoint.students / maxStudents * 80)) : 50;

                                                                                const deltaX = nextX - x;
                                                                                const deltaY = nextStudentY - studentY;
                                                                                const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                                                                                const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;

                                                                                return (
                                                                                    <div
                                                                                        className="absolute h-0.5 bg-blue-500 origin-left"
                                                                                        style={{
                                                                                            left: `${x}%`,
                                                                                            top: `${studentY}%`,
                                                                                            width: `${length}%`,
                                                                                            transform: `rotate(${angle}deg)`
                                                                                        }}
                                                                                    ></div>
                                                                                );
                                                                            })()}
                                                                        </React.Fragment>
                                                                    );
                                                                })}

                                                                {/* Schools Line */}
                                                                {dataPoints.map((point, index) => {
                                                                    const x = (index / (dataPoints.length - 1 || 1)) * 100;
                                                                    const schoolY = maxSchools > 0 ? (100 - (point.schools / maxSchools * 80)) : 50;

                                                                    return (
                                                                        <React.Fragment key={`school-${point.zip}`}>
                                                                            {/* School Line Point */}
                                                                            <div
                                                                                className="absolute w-4 h-4 bg-red-500 border-2 border-white rounded-full shadow-md hover:bg-red-600 hover:scale-125 transition-all cursor-pointer z-10"
                                                                                style={{
                                                                                    left: `${x}%`,
                                                                                    top: `${schoolY}%`,
                                                                                    transform: 'translate(-50%, -50%)'
                                                                                }}
                                                                                title={`ZIP ${point.zip}: ${point.schools} schools`}
                                                                            >
                                                                                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-bold text-red-700 opacity-0 hover:opacity-100 transition-opacity bg-white px-2 py-1 rounded shadow whitespace-nowrap">
                                                                                    {point.schools}
                                                                                </div>
                                                                            </div>

                                                                            {/* Connect school line points */}
                                                                            {index < dataPoints.length - 1 && (() => {
                                                                                const nextPoint = dataPoints[index + 1];
                                                                                const nextX = ((index + 1) / (dataPoints.length - 1 || 1)) * 100;
                                                                                const nextSchoolY = maxSchools > 0 ? (100 - (nextPoint.schools / maxSchools * 80)) : 50;

                                                                                const deltaX = nextX - x;
                                                                                const deltaY = nextSchoolY - schoolY;
                                                                                const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                                                                                const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;

                                                                                return (
                                                                                    <div
                                                                                        className="absolute h-0.5 bg-red-500 origin-left"
                                                                                        style={{
                                                                                            left: `${x}%`,
                                                                                            top: `${schoolY}%`,
                                                                                            width: `${length}%`,
                                                                                            transform: `rotate(${angle}deg)`
                                                                                        }}
                                                                                    ></div>
                                                                                );
                                                                            })()}
                                                                        </React.Fragment>
                                                                    );
                                                                })}

                                                                {/* ZIP Code Labels */}
                                                                {dataPoints.map((point, index) => {
                                                                    const x = (index / (dataPoints.length - 1 || 1)) * 100;

                                                                    return (
                                                                        <div
                                                                            key={`label-${point.zip}`}
                                                                            className="absolute text-xs text-gray-700 font-medium transform -translate-x-1/2"
                                                                            style={{
                                                                                left: `${x}%`,
                                                                                bottom: '-20px'
                                                                            }}
                                                                        >
                                                                            {point.zip}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>

                                                            {/* Legend */}
                                                            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 flex items-center gap-4 text-xs bg-white px-3 py-1 rounded shadow border">
                                                                <div className="flex items-center gap-1">
                                                                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                                                    <span>Students</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                                                    <span>Schools</span>
                                                                </div>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                            <div className="mt-2 text-xs text-muted-foreground text-center">
                                                Two line charts showing trends across ZIP codes • Hover points for exact values
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            <TabsContent value="comparison" className="space-y-4">
                                <div className="space-y-4">
                                    <h4 className="font-medium">Individual ZIP Comparison</h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="text-left p-2">ZIP Code</th>
                                                    <th className="text-right p-2">Students</th>
                                                    <th className="text-right p-2">Schools</th>
                                                    <th className="text-right p-2">Female</th>
                                                    <th className="text-right p-2">Male</th>
                                                    <th className="text-right p-2">Records</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedZips.map(zip => {
                                                    const zipData = zipSummaries.get(zip);
                                                    return (
                                                        <tr key={zip} className="border-b hover:bg-gray-50">
                                                            <td className="p-2 font-medium">{zip}</td>
                                                            <td className="p-2 text-right">{zipData?.totalStudents || 0}</td>
                                                            <td className="p-2 text-right">{Math.round((zipData?.schools || 0) / (zipData?.count || 1))}</td>
                                                            <td className="p-2 text-right">{zipData?.totalFemale || 0}</td>
                                                            <td className="p-2 text-right">{zipData?.totalMale || 0}</td>
                                                            <td className="p-2 text-right">{zipData?.count || 0}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            )
            }

            {/* Map */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        ZIP Code Overview Map
                        {selectedZips.length > 0 && (
                            <Badge variant="secondary">
                                {selectedZips.length} selected
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div ref={mapRef} className="h-96 w-full" />
                    <div className="p-4 bg-gray-50 border-t">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                                    <span>Low Population (&lt;1K)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-amber-500 rounded"></div>
                                    <span>Medium (1K-3K)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-orange-500 rounded"></div>
                                    <span>High (3K-5K)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                                    <span>Very High (&gt;5K)</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <div className="w-4 h-4 bg-purple-500 rounded border-2 border-purple-700"></div>
                                <span>Selected ZIP</span>

                                <span className="text-muted-foreground">Zoom: {currentZoom}</span>
                            </div>
                        </div>

                    </div>
                </CardContent>
            </Card>
        </div >
    );
};

export default OverviewMap;