import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Database, Search, Eye } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface DataExplorerProps {
  geoJsonData?: any;
  onZipSelect?: (zipCode: string) => void;
}

const DataExplorer: React.FC<DataExplorerProps> = ({ geoJsonData, onZipSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showAllColumnDetails, setShowAllColumnDetails] = useState(false);

  // Extract and analyze data structure
  const dataAnalysis = useMemo(() => {
    if (!geoJsonData?.features) return null;

    const features = geoJsonData.features;
    const allProperties = new Map<string, Set<any>>();
    const propertyTypes = new Map<string, string>();

    // Analyze all properties across features
    features.forEach((feature: any) => {
      const props = feature.properties || {};
      Object.entries(props).forEach(([key, value]) => {
        if (!allProperties.has(key)) {
          allProperties.set(key, new Set());
        }
        allProperties.get(key)!.add(value);

        // Determine property type
        if (!propertyTypes.has(key)) {
          const type = typeof value;
          const stringValue = String(value);
          if (type === 'string' && !isNaN(Date.parse(stringValue))) {
            propertyTypes.set(key, 'date');
          } else if (type === 'string' && !isNaN(Number(stringValue))) {
            propertyTypes.set(key, 'numeric');
          } else {
            propertyTypes.set(key, type);
          }
        }
      });
    });

    const columns = Array.from(allProperties.keys()).map(key => ({
      name: key,
      type: propertyTypes.get(key) || 'unknown',
      uniqueValues: allProperties.get(key)!.size,
      sampleValues: Array.from(allProperties.get(key)!).slice(0, 3),
    }));

    return {
      totalFeatures: features.length,
      totalColumns: columns.length,
      columns,
      features,
    };
  }, [geoJsonData]);

  // Filter and paginate data
  const filteredData = useMemo(() => {
    if (!dataAnalysis) return { features: [], totalPages: 0 };

    let filtered = dataAnalysis.features;

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((feature: any) => {
        const props = feature.properties || {};
        return Object.values(props).some(value =>
          String(value).toLowerCase().includes(searchLower)
        );
      });
    }

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedFeatures = filtered.slice(startIndex, startIndex + itemsPerPage);

    return {
      features: paginatedFeatures,
      totalPages,
      totalFiltered: filtered.length,
    };
  }, [dataAnalysis, searchTerm, currentPage, itemsPerPage]);





  if (!dataAnalysis) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Explorer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No data available. Upload a shapefile to explore the data structure.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Data Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Records</p>
              <p className="text-2xl font-bold">{dataAnalysis.totalFeatures}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Columns</p>
              <p className="text-2xl font-bold">{dataAnalysis.totalColumns}</p>
            </div>
          </div>

          {/* Column Information */}
          <div className="space-y-2">
            <h4 className="font-medium">Available Columns:</h4>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {dataAnalysis.columns.map(col => (
                <Badge
                  key={col.name}
                  variant="secondary"
                  className="text-xs"
                >
                  {col.name} ({col.type})
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Data Table</CardTitle>

          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search data..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8"
              />
            </div>
            <Badge variant="outline">
              {filteredData.totalFiltered} of {dataAnalysis.totalFeatures} records
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="border rounded-lg overflow-x-auto w-full" style={{ scrollbarWidth: 'thin' }}>
            <div className="min-w-max">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 sticky left-0 top-0 bg-primary text-primary-foreground border-r z-20 shadow-sm">
                      <div className="font-bold text-center">#</div>
                    </TableHead>
                    <TableHead className="w-24 sticky top-0 bg-primary text-primary-foreground z-10">
                      <div className="font-bold text-center">Details</div>
                    </TableHead>
                    {dataAnalysis.columns.map(col => (
                      <TableHead key={col.name} className="min-w-36 px-4 whitespace-nowrap sticky top-0 bg-primary text-primary-foreground z-10">
                        <div className="font-medium text-center" title={col.name}>
                          {col.name}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.features.map((feature: any, index: number) => {
                    const props = feature.properties || {};
                    const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;

                    return (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell className="font-bold sticky left-0 bg-white border-r z-10 shadow-sm text-center">
                          {globalIndex}
                        </TableCell>
                        <TableCell className="text-center">
                          {(() => {
                            const zipCode = props.Zip || props.ZIP || props.zipcode;
                            return zipCode ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onZipSelect?.(zipCode)}
                                className="h-6 px-2 text-xs"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-xs">N/A</span>
                            );
                          })()}
                        </TableCell>
                        {dataAnalysis.columns.map(col => (
                          <TableCell key={col.name} className="px-4 text-center min-w-36 whitespace-nowrap">
                            <div title={String(props[col.name] || '')}>
                              {props[col.name] != null ? String(props[col.name]) : '-'}
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Horizontal Scroll Hint */}
          <div className="mt-2 text-xs text-muted-foreground text-center">
            💡 Scroll horizontally to see all {dataAnalysis.columns.length} columns
          </div>

          {/* Pagination */}
          {filteredData.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {filteredData.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(filteredData.totalPages, currentPage + 1))}
                  disabled={currentPage === filteredData.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Column Details */}
      <Card>
        <CardHeader>
          <CardTitle>Column Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(showAllColumnDetails ? dataAnalysis.columns : dataAnalysis.columns.slice(0, 15)).map(col => (
              <div key={col.name} className="border rounded p-2 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium truncate">{col.name}</span>
                  <Badge variant="outline" className="text-xs">{col.type}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  <div>{col.uniqueValues} unique values</div>
                </div>
              </div>
            ))}
          </div>
          {dataAnalysis.columns.length > 15 && (
            <div className="text-center mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllColumnDetails(!showAllColumnDetails)}
              >
                {showAllColumnDetails ? (
                  <>Show Less Columns</>
                ) : (
                  <>Show All {dataAnalysis.columns.length} Columns</>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DataExplorer;