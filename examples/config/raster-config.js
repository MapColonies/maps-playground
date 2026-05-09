import { MAPCOLONIES_TILES_URL, TOKEN } from './common-config.js';

var WMTS_BASE_URL = `${MAPCOLONIES_TILES_URL}/api/raster/v1/wmts`;

export var LAYER_NAME = 'blueMarble-Orthophoto';
export var RASTER_SERVICE_URL = `${MAPCOLONIES_TILES_URL}/api/raster/v1/service`;
export var WMTS_CAPABILITIES_URL = `${WMTS_BASE_URL}/1.0.0/WMTSCapabilities.xml?token=${TOKEN}`;
export var WMTS_URL = `${WMTS_BASE_URL}/${LAYER_NAME}/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.jpeg`
