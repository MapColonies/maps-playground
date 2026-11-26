import { TOKEN } from './config/common-config.js';
import { PRODUCT_ID, PRODUCT_TYPE } from './config/raster-config.js';
import { TERRAINRGB_MAX_LEVEL, TERRAINRGB_EXTENT } from './config/dem-config.js';
import { fetchWmtsTileTemplate } from './utils/wmts-utils.js';
import { TILE_SIZE, tileUrl, decodeHeight, RAMP_STOPS } from './utils/terrainrgb-utils.js';

// An empty extent ('', [] or null) means the whole world.
const extent = TERRAINRGB_EXTENT?.length ? TERRAINRGB_EXTENT : undefined;

const worldCrs84Grid = (maxLevel) =>
	new ol.tilegrid.TileGrid({
		extent: [-180, -90, 180, 90],
		origin: [-180, 90],
		resolutions: Array.from({ length: maxLevel + 1 }, (_, z) => 0.703125 / 2 ** z),
		tileSize: TILE_SIZE
	});

// Bands arrive scaled to 0..1, so each is multiplied back by 255 before decoding.
const height = [
	'+',
	-10000,
	[
		'*',
		0.1,
		['+', ['*', 255 * 65536, ['band', 1]], ['*', 255 * 256, ['band', 2]], ['*', 255, ['band', 3]]]
	]
];

const layer = new ol.layer.WebGLTile({
	source: new ol.source.XYZ({
		projection: 'EPSG:4326',
		tileGrid: worldCrs84Grid(TERRAINRGB_MAX_LEVEL),
		tileUrlFunction: ([z, x, y]) => tileUrl(z, x, y),
		crossOrigin: 'anonymous',
		// Blending neighbouring pixels would mix their encoded bytes into wrong heights.
		interpolate: false
	}),
	extent,
	opacity: 0.4,
	style: {
		// Transparent pixels are no data.
		color: [
			'case',
			['==', ['band', 4], 0],
			[0, 0, 0, 0],
			['interpolate', ['linear'], height, ...RAMP_STOPS]
		]
	}
});

const map = new ol.Map({
	target: 'map',
	layers: [layer],
	view: new ol.View({ projection: 'EPSG:4326', center: [0, 0], zoom: 2 })
});
if (extent) map.getView().fit(extent);

fetchWmtsTileTemplate(PRODUCT_ID, PRODUCT_TYPE).then(({ template }) => {
	const url = template
		.replace('{TileMatrixSet}', 'WorldCRS84')
		.replace('{TileMatrix}', '{z}')
		.replace('{TileRow}', '{y}')
		.replace('{TileCol}', '{x}');
	const base = new ol.layer.Tile({
		source: new ol.source.XYZ({
			projection: 'EPSG:4326',
			tileGrid: worldCrs84Grid(21),
			url: `${url}?token=${TOKEN}`
		})
	});
	map.getLayers().insertAt(0, base);
});

const info = document.getElementById('info');
map.on('pointermove', (event) => {
	const pixel = layer.getData(event.pixel);
	if (!pixel || pixel[3] === 0) {
		info.textContent = 'no data';
		return;
	}
	const [lon, lat] = event.coordinate;
	info.textContent = `${decodeHeight(pixel[0], pixel[1], pixel[2]).toFixed(1)} m at ${lat.toFixed(
		4
	)}, ${lon.toFixed(4)}`;
});
