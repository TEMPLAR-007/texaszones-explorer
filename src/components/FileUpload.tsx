import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle, Database, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import * as shapefile from 'shapefile';

interface FileUploadProps {
  onGeoJsonLoaded: (geoJson: any) => void;
  hasCache?: boolean;
  onClearCache?: () => void;
  compact?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onGeoJsonLoaded, hasCache = false, onClearCache, compact = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{
    shp?: File;
    dbf?: File;
    shx?: File;
    prj?: File;
  }>({});

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  }, []);

  const handleFiles = (files: File[]) => {
    const newFiles = { ...uploadedFiles };
    
    files.forEach(file => {
      const extension = file.name.toLowerCase().split('.').pop();
      if (extension === 'shp' || extension === 'dbf' || extension === 'shx' || extension === 'prj') {
        newFiles[extension as keyof typeof newFiles] = file;
      }
    });
    
    setUploadedFiles(newFiles);
    setError(null);
  };

  const processShapefile = async () => {
    if (!uploadedFiles.shp || !uploadedFiles.dbf) {
      setError('Please upload both .shp and .dbf files');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const shpBuffer = await uploadedFiles.shp.arrayBuffer();
      const dbfBuffer = await uploadedFiles.dbf.arrayBuffer();
      
      const features: any[] = [];
      
      await shapefile.read(shpBuffer, dbfBuffer)
        .then((collection) => {
          if (collection.features) {
            features.push(...collection.features);
          }
        });

      const geoJson = {
        type: 'FeatureCollection',
        features: features,
      };

      onGeoJsonLoaded(geoJson);
    } catch (err) {
      console.error('Error processing shapefile:', err);
      setError('Failed to process shapefile. Please check your files and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetFiles = () => {
    setUploadedFiles({});
    setError(null);
  };

  const hasRequiredFiles = uploadedFiles.shp && uploadedFiles.dbf;

  // Compact view when data is already loaded
  if (compact && hasCache) {
    return (
      <Card className="w-full">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Data Loaded</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                Cached
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('file-input')?.click()}
                className="h-8 px-3 text-xs"
              >
                <Upload className="h-3 w-3 mr-1" />
                Replace
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClearCache}
                className="h-8 px-2"
                title="Clear cached data"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <input
            id="file-input"
            type="file"
            multiple
            accept=".shp,.dbf,.shx,.prj"
            onChange={handleFileInput}
            className="hidden"
          />
          
          {/* Show upload progress if files are being processed */}
          {(uploadedFiles.shp || uploadedFiles.dbf) && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>New files selected</span>
                </div>
                <Button
                  onClick={processShapefile}
                  disabled={!hasRequiredFiles || isLoading}
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  {isLoading ? 'Processing...' : 'Load'}
                </Button>
              </div>
            </div>
          )}
          
          {error && (
            <Alert variant="destructive" className="mt-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full view for initial upload
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Shapefile
          </div>
          {hasCache && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Database className="h-3 w-3" />
                Data Cached
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={onClearCache}
                className="h-8 px-2"
                title="Clear cached data"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasCache && (
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              Data loaded from cache. Upload new files to replace cached data.
            </AlertDescription>
          </Alert>
        )}
        
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            <strong>Select multiple files</strong> or drag and drop here
          </p>
          <p className="text-xs text-muted-foreground">
            Required: .shp, .dbf | Optional: .shx, .prj
          </p>
        </div>
        
        <input
          id="file-input"
          type="file"
          multiple
          accept=".shp,.dbf,.shx,.prj"
          onChange={handleFileInput}
          className="hidden"
        />

        {(uploadedFiles.shp || uploadedFiles.dbf || uploadedFiles.shx) && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Uploaded Files:</p>
            {Object.entries(uploadedFiles).map(([ext, file]) => (
              file && (
                <div key={ext} className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>{file.name}</span>
                </div>
              )
            ))}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            onClick={processShapefile}
            disabled={!hasRequiredFiles || isLoading}
            className="flex-1"
            variant="default"
          >
            {isLoading ? 'Processing...' : 'Load Shapefile'}
          </Button>
          {Object.keys(uploadedFiles).length > 0 && (
            <Button variant="outline" onClick={resetFiles}>
              Reset
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUpload;