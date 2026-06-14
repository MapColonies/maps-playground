import { MAPCOLONIES_TILES_URL } from './config/common-config.js';

export var DEM_SCHEME = 'WCS';
export var PRODUCT_ID = 'srtm_100_30-aoi';
export var PRODUCT_TYPE = 'DTM';
export var DEM_URL = `${MAPCOLONIES_TILES_URL}/api/dem/v1/terrains/${PRODUCT_ID}`;
