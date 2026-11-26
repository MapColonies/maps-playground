import { MAPCOLONIES_TILES_URL } from './config/common-config.js';

export var DEM_SCHEME = 'WCS';
export var PRODUCT_ID = 'PRODUCT_ID';
export var PRODUCT_TYPE = 'DTM';
export var DEM_TERRAIN_SCHEME = 'TERRAIN_QMESH';
export var TERRAIN_PRODUCT_ID = 'TERRAIN_PRODUCT_ID';
export var TERRAIN_PRODUCT_TYPE = 'QuantizedMeshDTMBest';
export var DEM_URL = `${MAPCOLONIES_TILES_URL}/api/dem/v1/terrains/${PRODUCT_ID}`;
export var TERRAINRGB_LAYER = 'TERRAINRGB_LAYER';
// Tile rows count from the top (WorldCRS84); tiles outside the data answer 404.
export var TERRAINRGB_URL = `${MAPCOLONIES_TILES_URL}/api/dem/v1/terrains/${TERRAINRGB_LAYER}/{z}/{x}/{y}.webp`;
export var TERRAINRGB_MAX_LEVEL = 'TERRAINRGB_MAX_LEVEL';
// [minX, minY, maxX, maxY] in degrees, e.g. [34, 29, 36, 34]; '' or [] skips it.
export var TERRAINRGB_EXTENT = 'TERRAINRGB_EXTENT';
