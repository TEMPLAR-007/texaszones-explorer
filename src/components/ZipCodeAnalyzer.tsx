import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Eye, Calculator, Map as MapIcon, BarChart3 } from 'lucide-react';
import ZipMapView from './ZipMapView';
import ZipChartView from './ZipChartView';

interface ZipCodeAnalyzerProps {
  geoJsonData?: any;
  onZipSelect?: (zipCode: string) => void;
  initialSelectedZip?: string;
}

const ZipCodeAnalyzer: React.FC<ZipCodeAnalyzerProps> = ({ geoJsonData, onZipSelect, initialSelectedZip }) => {
  const [selectedZip, setSelectedZip] = useState<string>('');

  // Update selectedZip when initialSelectedZip changes
  useEffect(() => {
    if (initialSelectedZip) {
      setSelectedZip(initialSelectedZip);
    } else {
      setSelectedZip('');
    }
  }, [initialSelectedZip]);

  const zipAnalysis = useMemo(() => {
    if (!geoJsonData?.features) return null;

    const zipData = new Map();

    geoJsonData.features.forEach((feature: any) => {
      const props = feature.properties || {};
      const zip = props.Zip || props.ZIP || props.zipcode;

      if (!zip) return;

      if (!zipData.has(zip)) {
        zipData.set(zip, {
          zip,
          rawRecords: [],
          count: 0,
          totalStudents: 0,
          totalFemale: 0,
          totalMale: 0,
          totalPreK: 0,
          totalKG: 0,
          totalGrade1: 0,
          totalGrade2: 0,
          totalGrade3: 0,
          processedTotals: new Map(),
        });
      }

      const zipInfo = zipData.get(zip);
      zipInfo.rawRecords.push(props);
      zipInfo.count++;

      // Process all numeric fields dynamically
      Object.entries(props).forEach(([key, value]) => {
        const numValue = parseInt(String(value || 0));
        if (!isNaN(numValue) && numValue >= 0) {
          if (!zipInfo.processedTotals.has(key)) {
            zipInfo.processedTotals.set(key, 0);
          }
          zipInfo.processedTotals.set(key, zipInfo.processedTotals.get(key) + numValue);
        }
      });

      const female = parseInt(props.Female || 0);
      const male = parseInt(props.Male || 0);
      const preK = parseInt(props.Pre_K || 0);
      const kg = parseInt(props.KG || 0);
      const grade1 = parseInt(props.Grade_1 || 0);
      const grade2 = parseInt(props.Grade_2 || 0);
      const grade3 = parseInt(props.Grade_3 || 0);

      zipInfo.totalFemale += female;
      zipInfo.totalMale += male;
      zipInfo.totalPreK += preK;
      zipInfo.totalKG += kg;
      zipInfo.totalGrade1 += grade1;
      zipInfo.totalGrade2 += grade2;
      zipInfo.totalGrade3 += grade3;
      zipInfo.totalStudents = zipInfo.totalFemale + zipInfo.totalMale;
    });

    return Array.from(zipData.values()).sort((a, b) => a.zip.localeCompare(b.zip));
  }, [geoJsonData]);

  const selectedZipData = useMemo(() => {
    if (!selectedZip || !zipAnalysis) return null;
    return zipAnalysis.find(zip => zip.zip === selectedZip);
  }, [selectedZip, zipAnalysis]);

  if (!zipAnalysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ZIP Code Analyzer</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No data available. Upload a shapefile to analyze ZIP codes.</p>
        </CardContent>
      </Card>
    );
  }

  // If no ZIP is selected, show selector
  if (!selectedZip) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              ZIP Code Analyzer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select a ZIP code to view detailed analysis and raw data
              </p>

              <div className="flex items-center gap-4">
                <Select value={selectedZip} onValueChange={setSelectedZip}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Choose a ZIP code..." />
                  </SelectTrigger>
                  <SelectContent>
                    {zipAnalysis.map((zip: any) => (
                      <SelectItem key={zip.zip} value={zip.zip}>
                        {zip.zip} ({zip.totalStudents} students)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Badge variant="outline">
                  {zipAnalysis.length} ZIP codes available
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show detailed view for selected ZIP
  if (!selectedZipData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ZIP Code Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No data found for ZIP code {selectedZip}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ZIP Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={selectedZip} onValueChange={setSelectedZip}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Choose a ZIP code..." />
          </SelectTrigger>
          <SelectContent>
            {zipAnalysis.map((zip: any) => (
              <SelectItem key={zip.zip} value={zip.zip}>
                {zip.zip} ({zip.totalStudents} students)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ZIP Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            ZIP Code {selectedZip} - Detailed Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{selectedZipData.count}</p>
              <p className="text-sm text-muted-foreground">Records</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{selectedZipData.totalStudents}</p>
              <p className="text-sm text-muted-foreground">Total Students</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{selectedZipData.totalFemale}</p>
              <p className="text-sm text-muted-foreground">Female</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">{selectedZipData.totalMale}</p>
              <p className="text-sm text-muted-foreground">Male</p>
            </div>
          </div>

          {/* Detailed Data Tabs */}
          <Tabs defaultValue="map" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="map">
                <MapIcon className="h-4 w-4 mr-2" />
                Map View
              </TabsTrigger>
              <TabsTrigger value="charts">
                <BarChart3 className="h-4 w-4 mr-2" />
                Charts
              </TabsTrigger>
              <TabsTrigger value="processed">
                <Calculator className="h-4 w-4 mr-2" />
                Processed Data
              </TabsTrigger>
              <TabsTrigger value="raw">
                <Eye className="h-4 w-4 mr-2" />
                Raw Records
              </TabsTrigger>
            </TabsList>

            <TabsContent value="map" className="space-y-4">
              <ZipMapView
                zipCode={selectedZip}
                zipData={selectedZipData}
                geoJsonData={geoJsonData}
              />
            </TabsContent>

            <TabsContent value="charts" className="space-y-4">
              <ZipChartView
                zipCode={selectedZip}
                zipData={selectedZipData}
              />
            </TabsContent>

            <TabsContent value="processed" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Processed Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Student Demographics */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-blue-600 border-b pb-1">Student Demographics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Female Students:</span>
                          <span className="font-medium">{selectedZipData.totalFemale}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Male Students:</span>
                          <span className="font-medium">{selectedZipData.totalMale}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Students (Calculated):</span>
                          <span className="font-bold">{selectedZipData.totalStudents}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Ttl_Std (From Data):</span>
                          <span className="font-medium">{selectedZipData.processedTotals?.get('Ttl_Std') || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Grade Levels */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-green-600 border-b pb-1">Grade Levels</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Pre-K:</span>
                          <span className="font-medium">{selectedZipData.processedTotals?.get('Pre_K') || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Kindergarten (KG):</span>
                          <span className="font-medium">{selectedZipData.processedTotals?.get('KG') || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Grade 1:</span>
                          <span className="font-medium">{selectedZipData.processedTotals?.get('Grade_1') || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Grade 2:</span>
                          <span className="font-medium">{selectedZipData.processedTotals?.get('Grade_2') || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Grade 3:</span>
                          <span className="font-medium">{selectedZipData.processedTotals?.get('Grade_3') || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Grade 4:</span>
                          <span className="font-medium">{selectedZipData.processedTotals?.get('Grade_4') || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Grade 5:</span>
                          <span className="font-medium">{selectedZipData.processedTotals?.get('Grade_5') || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* School Information */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-purple-600 border-b pb-1">School Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>School Level (Schl_Lv):</span>
                          <span className="font-medium">
                            {(() => {
                              const levels = new Set();
                              selectedZipData.rawRecords.forEach((r: any) => {
                                if (r.Schl_Lv) levels.add(r.Schl_Lv);
                              });
                              return Array.from(levels).join(', ') || 'N/A';
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>School Count (Schl_Cn):</span>
                          <span className="font-medium">{selectedZipData.processedTotals?.get('Schl_Cn') || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Student Ratio (Stdnt_R):</span>
                          <span className="font-medium">{selectedZipData.processedTotals?.get('Stdnt_R') || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>State:</span>
                          <span className="font-medium">
                            {(() => {
                              const states = new Set();
                              selectedZipData.rawRecords.forEach((r: any) => {
                                if (r.state) states.add(r.state);
                              });
                              return Array.from(states).join(', ') || 'N/A';
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="raw" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Raw Records ({selectedZipData.count} records)</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Property Count Info */}
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">
                      Showing all {(() => {
                        const allProperties = new Set<string>();
                        selectedZipData.rawRecords.forEach((record: any) => {
                          Object.keys(record).forEach(key => allProperties.add(key));
                        });
                        return allProperties.size;
                      })()} properties for each record in vertical format.
                    </p>
                  </div>

                  {/* Vertical Records Display */}
                  <div className="space-y-6 max-h-96 overflow-y-auto">
                    {selectedZipData.rawRecords.map((record: any, recordIndex: number) => {
                      // Get all properties for this record
                      const properties = Object.entries(record).sort(([a], [b]) => a.localeCompare(b));

                      return (
                        <Card key={recordIndex} className="border-l-4 border-l-blue-500">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center justify-between">
                              <span>Record #{recordIndex + 1}</span>
                              <Badge variant="outline">{properties.length} properties</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {properties.map(([property, value]) => (
                                <div key={property} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <span className="font-medium text-sm text-gray-700 truncate mr-2">
                                    {property}:
                                  </span>
                                  <span className="text-sm font-mono bg-white px-2 py-1 rounded border">
                                    {value != null ? String(value) : '-'}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Quick Stats for this record */}
                            <div className="mt-4 pt-3 border-t grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              <div className="text-center p-2 bg-blue-50 rounded">
                                <div className="font-bold text-blue-600">{record.Female || 0}</div>
                                <div className="text-muted-foreground">Female</div>
                              </div>
                              <div className="text-center p-2 bg-green-50 rounded">
                                <div className="font-bold text-green-600">{record.Male || 0}</div>
                                <div className="text-muted-foreground">Male</div>
                              </div>
                              <div className="text-center p-2 bg-purple-50 rounded">
                                <div className="font-bold text-purple-600">{(parseInt(record.Female || 0) + parseInt(record.Male || 0))}</div>
                                <div className="text-muted-foreground">Total</div>
                              </div>
                              <div className="text-center p-2 bg-orange-50 rounded">
                                <div className="font-bold text-orange-600">{record.Schl_Lv || 'N/A'}</div>
                                <div className="text-muted-foreground">Level</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Records Summary */}
                  <div className="mt-4 text-center text-sm text-muted-foreground">
                    Showing {selectedZipData.rawRecords.length} record(s) with all properties in vertical format
                  </div>

                  {/* Manual Verification */}
                  <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
                    <p className="font-medium mb-1">Manual Verification:</p>
                    <p>Female sum = {selectedZipData.rawRecords.reduce((sum: number, r: any) => sum + parseInt(r.Female || 0), 0)}</p>
                    <p>Male sum = {selectedZipData.rawRecords.reduce((sum: number, r: any) => sum + parseInt(r.Male || 0), 0)}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ZipCodeAnalyzer;