import * as shapefile from 'shapefile';

export interface ShapefileData {
    shp: ArrayBuffer;
    dbf: ArrayBuffer;
    shx?: ArrayBuffer;
    prj?: string;
}

export interface GeoJsonCollection {
    type: 'FeatureCollection';
    features: Array<{
        type: string;
        geometry: unknown;
        properties: Record<string, unknown>;
    }>;
}

/**
 * Load shapefile data from the public folder
 */
export const loadShapefileFromPublic = async (baseName: string = 'TXelementary'): Promise<GeoJsonCollection> => {
    try {
        console.log(`🔄 Loading shapefile data from public folder: ${baseName}`);

        // Load required files (.shp and .dbf)
        const shpResponse = await fetch(`/data/${baseName}.shp`);
        const dbfResponse = await fetch(`/data/${baseName}.dbf`);

        if (!shpResponse.ok || !dbfResponse.ok) {
            throw new Error(`Failed to load required shapefile components. SHP: ${shpResponse.status}, DBF: ${dbfResponse.status}`);
        }

        const shpBuffer = await shpResponse.arrayBuffer();
        const dbfBuffer = await dbfResponse.arrayBuffer();

        console.log('✅ Successfully loaded SHP and DBF files from public folder');

        // Process the shapefile using the shapefile library
        const features: Array<{
            type: string;
            geometry: unknown;
            properties: Record<string, unknown>;
        }> = [];

        await shapefile.read(shpBuffer, dbfBuffer)
            .then((collection) => {
                if (collection.features) {
                    features.push(...collection.features);
                }
            });

        const geoJson: GeoJsonCollection = {
            type: 'FeatureCollection',
            features: features,
        };

        console.log(`📊 Processed shapefile: ${features.length} features loaded`);
        return geoJson;

    } catch (error) {
        console.error('❌ Error loading shapefile from public folder:', error);
        throw error;
    }
};

/**
 * Check if shapefile data exists in the public folder
 */
export const checkShapefileExists = async (baseName: string = 'TXelementary'): Promise<boolean> => {
    try {
        const shpResponse = await fetch(`/data/${baseName}.shp`, { method: 'HEAD' });
        const dbfResponse = await fetch(`/data/${baseName}.dbf`, { method: 'HEAD' });

        return shpResponse.ok && dbfResponse.ok;
    } catch (error) {
        console.error('Error checking shapefile existence:', error);
        return false;
    }
};