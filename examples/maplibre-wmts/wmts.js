import { TOKEN } from './config/common-config.js';
import { PRODUCT_ID, PRODUCT_TYPE } from './config/raster-config.js';
import { fetchWmtsTileTemplate } from './utils/wmts-utils.js';

// Flems runs scripts from blob URLs, where a root-relative import cannot resolve.
const maplibregl = await import(
	`${location.origin}/libs/maplibre-gl-crs84/6.7.0-rc.1/maplibre-gl.mjs`
);

const parser = (urlTemplate) => {
	return urlTemplate
		.replace('{TileMatrixSet}', 'WorldCRS84')
		.replace('{TileMatrix}', '{z}')
		.replace('{TileRow}', '{y}')
		.replace('{TileCol}', '{x}');
};

// Global setting: must be called before any map is created. WorldCRS84Quad is the fork's default.
maplibregl.setWorldCRS('WorldCRS84Quad');

const map = new maplibregl.Map({
	container: 'map',
	style: { version: 8, sources: {}, layers: [] },
	center: [0, 0],
	zoom: 1
});

Promise.all([fetchWmtsTileTemplate(PRODUCT_ID, PRODUCT_TYPE), map.once('load')]).then(
	([{ template, name }]) => {
		map.addSource(name, {
			type: 'raster',
			tiles: [parser(template) + `?token=${TOKEN}`],
			tileSize: 256
		});
		map.addLayer({ id: name, type: 'raster', source: name });
	}
);
