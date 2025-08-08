import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import FileUpload from '@/components/FileUpload';
import DataExplorer from '@/components/DataExplorer';
import ZipCodeAnalyzer from '@/components/ZipCodeAnalyzer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const DB_NAME = 'TexasZonesDB';
const DB_VERSION = 1;
const STORE_NAME = 'geojson-data';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// IndexedDB utilities
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

const saveToIndexedDB = async (data: any): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  const record = {
    id: 'geojson-cache',
    data: data,
    timestamp: Date.now()
  };

  return new Promise((resolve, reject) => {
    const request = store.put(record);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

const loadFromIndexedDB = async (): Promise<any | null> => {
  try {
    console.log('🔄 Opening IndexedDB...');
    const db = await openDB();
    console.log('✅ IndexedDB opened successfully');

    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      console.log('🔍 Requesting cached data...');
      const request = store.get('geojson-cache');

      request.onerror = () => {
        console.error('❌ Error getting data from IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const result = request.result;
        console.log('📦 IndexedDB request result:', {
          hasResult: !!result,
          timestamp: result?.timestamp,
          hasData: !!result?.data
        });

        if (result) {
          const age = Date.now() - result.timestamp;
          console.log('⏰ Cache age check:', {
            age: Math.round(age / 1000 / 60), // minutes
            maxAge: Math.round(CACHE_DURATION / 1000 / 60), // minutes
            isValid: age < CACHE_DURATION
          });

          if (age < CACHE_DURATION) {
            console.log('✅ Cache is valid, returning data');
            resolve(result.data);
          } else {
            console.log('🕒 Cache expired, clearing and returning null');
            clearIndexedDBCache();
            resolve(null);
          }
        } else {
          console.log('📭 No cached data found');
          resolve(null);
        }
      };
    });
  } catch (error) {
    console.error('❌ Error loading from IndexedDB:', error);
    return null;
  }
};

const clearIndexedDBCache = async (): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete('geojson-cache');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error('Error clearing IndexedDB cache:', error);
  }
};

const Index = () => {
  const [originalGeoJson, setOriginalGeoJson] = useState<any>(null);
  const [filteredGeoJson, setFilteredGeoJson] = useState<any>(null);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [comparisonAreas, setComparisonAreas] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('data');
  const [selectedZipCode, setSelectedZipCode] = useState<string>('');
  const [zipToShow, setZipToShow] = useState<string>('');
  const [isLoadingFromCache, setIsLoadingFromCache] = useState(true);

  // Load data from cache on component mount
  useEffect(() => {
    const loadFromCache = async () => {
      console.log('🔍 Checking for cached data in IndexedDB...');

      // Check if IndexedDB is available
      if (!window.indexedDB) {
        console.log('❌ IndexedDB not supported');
        setIsLoadingFromCache(false);
        return;
      }

      console.log('✅ IndexedDB is available');

      try {
        const cachedData = await loadFromIndexedDB();

        if (cachedData) {
          console.log('📊 Loaded GeoJSON from IndexedDB:', {
            type: cachedData.type,
            featureCount: cachedData.features?.length || 0
          });

          setOriginalGeoJson(cachedData);
          setFilteredGeoJson(cachedData);
          console.log('✅ Successfully loaded data from IndexedDB cache');
        } else {
          console.log('📭 No cached data found in IndexedDB');
        }
      } catch (error) {
        console.error('❌ Error loading from IndexedDB cache:', error);
        try {
          await clearIndexedDBCache();
        } catch (clearError) {
          console.error('❌ Error clearing corrupted cache:', clearError);
        }
      } finally {
        setIsLoadingFromCache(false);
        console.log('🏁 Cache loading complete');
      }
    };

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('⏰ Cache loading timeout, stopping loading state');
      setIsLoadingFromCache(false);
    }, 5000); // 5 second timeout

    // Call the async function
    loadFromCache()
      .then(() => {
        clearTimeout(timeoutId);
      })
      .catch((error) => {
        console.error('❌ Unexpected error in loadFromCache:', error);
        clearTimeout(timeoutId);
        setIsLoadingFromCache(false);
      });

    // Cleanup timeout on unmount
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  const handleGeoJsonLoaded = async (geoJson: any) => {
    console.log('📥 New GeoJSON data received:', {
      type: geoJson.type,
      featureCount: geoJson.features?.length || 0
    });

    setOriginalGeoJson(geoJson);
    setFilteredGeoJson(geoJson);

    // Save to IndexedDB cache
    try {
      const dataString = JSON.stringify(geoJson);
      console.log('💾 Saving to IndexedDB cache:', {
        dataSize: `${Math.round(dataString.length / 1024)} KB`,
        features: geoJson.features?.length || 0
      });

      await saveToIndexedDB(geoJson);
      console.log('✅ Data successfully saved to IndexedDB cache');

    } catch (error) {
      console.error('❌ Error saving to IndexedDB cache:', error);

      // Try to clear cache and retry
      try {
        console.log('🧹 Clearing IndexedDB cache and retrying...');
        await clearIndexedDBCache();
        await saveToIndexedDB(geoJson);
        console.log('✅ Data saved to IndexedDB cache after clearing');
      } catch (retryError) {
        console.error('❌ Failed to save to IndexedDB cache even after clearing:', retryError);
      }
    }
  };

  const clearCache = async () => {
    try {
      await clearIndexedDBCache();
      setOriginalGeoJson(null);
      setFilteredGeoJson(null);
      setZipToShow('');
      setActiveTab('data');
      console.log('🗑️ IndexedDB cache cleared');
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
    }
  };

  const handleFilterChange = (filteredData: any) => {
    setFilteredGeoJson(filteredData);
  };

  const handleFeatureClick = (feature: any) => {
    setSelectedFeature(feature);
  };

  const handleCompareAreas = (area1: any, area2: any) => {
    setComparisonAreas([area1, area2]);
  };

  const handleZipSelect = (zipCode: string) => {
    setSelectedZipCode(zipCode);
    // Filter data to show only selected ZIP
    if (originalGeoJson) {
      const filteredData = {
        ...originalGeoJson,
        features: originalGeoJson.features.filter((feature: any) => {
          const zip = feature.properties?.Zip || feature.properties?.ZIP || feature.properties?.zipcode;
          return zip === zipCode;
        })
      };
      setFilteredGeoJson(filteredData);
      setActiveTab('filters'); // Switch to map view
    }
  };

  const displayedGeoJson = filteredGeoJson || originalGeoJson;
  const zoneCount = displayedGeoJson?.features?.length || 0;

  // Show loading state while checking cache
  if (isLoadingFromCache) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading cached data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header zoneCount={zoneCount} />

      <div className="container mx-auto px-4 py-6">
        {/* Dynamic Layout based on active tab */}
        <div className="grid grid-cols-1 gap-6 h-[calc(100vh-140px)] lg:grid-cols-1">
          {/* Controls Section */}
          <div className="space-y-4 overflow-y-auto lg:col-span-1">
            <FileUpload
              onGeoJsonLoaded={handleGeoJsonLoaded}
              hasCache={!!originalGeoJson && !isLoadingFromCache}
              onClearCache={clearCache}
              compact={!!originalGeoJson && !isLoadingFromCache}
            />

            <Tabs value={activeTab} onValueChange={(value) => {
              setActiveTab(value);
              // Clear zipToShow when switching away from ZIP tab
              if (value !== 'zip') {
                setZipToShow('');
              }
            }} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="data">Data</TabsTrigger>
                <TabsTrigger value="zip">ZIP</TabsTrigger>
              </TabsList>

              <TabsContent value="data" className="space-y-4">
                <DataExplorer
                  geoJsonData={originalGeoJson}
                  onZipSelect={(zipCode) => {
                    setZipToShow(zipCode);
                    setActiveTab('zip');
                  }}
                />
              </TabsContent>

              <TabsContent value="zip" className="space-y-4">
                <ZipCodeAnalyzer
                  geoJsonData={originalGeoJson}
                  onZipSelect={handleZipSelect}
                  initialSelectedZip={zipToShow}
                />
              </TabsContent>
            </Tabs>
          </div>


        </div>
      </div>
    </div>
  );
};

export default Index;