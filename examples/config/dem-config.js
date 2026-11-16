import { MAPCOLONIES_TILES_URL } from './config/common-config.js';

export var DEM_SCHEME = 'WCS';
export var PRODUCT_ID = 'srtm_100_30-aoi';
export var PRODUCT_TYPE = 'DTM';
export var DEM_TERRAIN_SCHEME = 'TERRAIN_QMESH';
export var TERRAIN_PRODUCT_ID = '33333333-3333-3333-3333-333333333333';
export var TERRAIN_PRODUCT_TYPE = 'QuantizedMeshDTMBest';
export var DEM_URL = `${MAPCOLONIES_TILES_URL}/api/dem/v1/terrains/${PRODUCT_ID}`;
export var TERRAINRGB_LAYER = 'a3-05m';
// Tile rows count from the top (WorldCRS84); tiles outside the data answer 404.
export var TERRAINRGB_URL = `${MAPCOLONIES_TILES_URL}/api/dem/terrainrgb/cogs/${TERRAINRGB_LAYER}/{z}/{x}/{y}.webp`;
export var TERRAINRGB_MAX_LEVEL = 15;
export var TERRAINRGB_EXTENT = [34.9, 32.36, 35.36, 32.75];
