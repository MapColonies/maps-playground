import { MAPCOLONIES_TILES_URL, TOKEN } from './config/common-config.js';

var WMTS_BASE_URL = `${MAPCOLONIES_TILES_URL}/api/raster/v1/wmts`;

export var RASTER_SCHEME = 'WMTS';
export var PRODUCT_ID = 'blueMarble';
export var PRODUCT_TYPE = 'Orthophoto';
export var LAYER_NAME = `${PRODUCT_ID}-${PRODUCT_TYPE}`;
export var ADDITIONAL_LAYER_NAME = `${PRODUCT_ID}-${PRODUCT_TYPE}`;
export var LAYER_IMAGE_FORMAT = 'image/png';
export var RASTER_SERVICE_URL = `${MAPCOLONIES_TILES_URL}/api/raster/v1/service`;
export var WMTS_CAPABILITIES_URL = `${WMTS_BASE_URL}/1.0.0/WMTSCapabilities.xml?token=${TOKEN}`;
export var WMTS_URL = `${WMTS_BASE_URL}/${LAYER_NAME}/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.jpeg`;
