import { TOKEN } from './config/common-config.js';
import { PRODUCT_ID, PRODUCT_TYPE } from './config/raster-config.js';
import { fetchWmtsTileTemplate } from './utils/wmts-utils.js';

const parser = (urlTemplate) => {
	return urlTemplate
		.replace('{TileMatrixSet}', 'WorldCRS84')
		.replace('{TileMatrix}', '{z}')
		.replace('{TileRow}', '{y}')
		.replace('{TileCol}', '{x}');
};

const layerName = `${PRODUCT_ID}-${PRODUCT_TYPE}`;
const map = L.map('map', { crs: L.CRS.EPSG4326 }).setView([0.0, 0.0], 1);

fetchWmtsTileTemplate(PRODUCT_ID, PRODUCT_TYPE).then((urlTemplate) => {
	const parsedUrl = parser(urlTemplate);
	const layer = L.tileLayer(parsedUrl + `?token=${TOKEN}`, { id: layerName });
	map.addLayer(layer);
});
