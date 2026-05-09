import { TOKEN } from './config/common-config.js';
import { LAYER_NAME, WMTS_URL } from './config/raster-config.js';

const parser = (urlTemplate) => {
  return urlTemplate.replace("{TileMatrixSet}", "WorldCRS84").replace("{TileMatrix}", "{z}").replace("{TileRow}", "{y}").replace("{TileCol}", "{x}");
}

const urlTemplate = WMTS_URL;
const parsedUrl = parser(urlTemplate);


const map = L.map('map', { crs: L.CRS.EPSG4326 }).setView([0.0, 0.0], 1);
const layer = L.tileLayer(parsedUrl + `?token=${TOKEN}`, { id: LAYER_NAME });

map.addLayer(layer);
