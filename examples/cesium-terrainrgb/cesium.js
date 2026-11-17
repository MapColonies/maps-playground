import { PRODUCT_ID, PRODUCT_TYPE, LAYER_IMAGE_FORMAT } from './config/raster-config.js';
import { TOKEN } from './config/common-config.js';
import { TERRAINRGB_MAX_LEVEL, TERRAINRGB_EXTENT } from './config/dem-config.js';
import { fetchWmtsTileTemplate } from './utils/wmts-utils.js';
import { TILE_SIZE, fetchHeights } from './utils/terrainrgb-utils.js';

const flat = () => new Float32Array(TILE_SIZE * TILE_SIZE);

function intersectsData(level, x, y) {
	const size = 180 / 2 ** level;
	const west = -180 + x * size;
	const north = 90 - y * size;
	const [minX, minY, maxX, maxY] = TERRAINRGB_EXTENT;
	return west < maxX && west + size > minX && north > minY && north - size < maxY;
}

// Cesium places heightmap samples edge to edge, while tile pixels sit half a pixel in from the edge.
// Resamples the square that starts at pixel (left, top) and is `span` pixels wide onto Cesium's grid.
function toCesiumGrid(heights, left, top, span) {
	const n = TILE_SIZE;
	const out = new Float32Array(n * n);
	const positions = (start) =>
		Array.from({ length: n }, (_, k) =>
			Math.min(Math.max(start + (k * span) / (n - 1) - 0.5, 0), n - 1)
		);
	const rows = positions(top);
	const cols = positions(left);
	for (let r = 0; r < n; r++) {
		const y0 = Math.floor(rows[r]);
		const y1 = Math.min(y0 + 1, n - 1);
		const fy = rows[r] - y0;
		for (let c = 0; c < n; c++) {
			const x0 = Math.floor(cols[c]);
			const x1 = Math.min(x0 + 1, n - 1);
			const fx = cols[c] - x0;
			const upper = heights[y0 * n + x0] * (1 - fx) + heights[y0 * n + x1] * fx;
			const lower = heights[y1 * n + x0] * (1 - fx) + heights[y1 * n + x1] * fx;
			out[r * n + c] = upper * (1 - fy) + lower * fy;
		}
	}
	return out;
}

const terrainProvider = new Cesium.CustomHeightmapTerrainProvider({
	width: TILE_SIZE,
	height: TILE_SIZE,
	tilingScheme: new Cesium.GeographicTilingScheme(),
	// Cesium asks for every level, so levels past the top one are cut out of their top-level ancestor.
	callback: async (x, y, level) => {
		if (!intersectsData(level, x, y)) return flat();
		const up = Math.max(level - TERRAINRGB_MAX_LEVEL, 0);
		const span = TILE_SIZE / 2 ** up;
		const heights = await fetchHeights(level - up, x >> up, y >> up).catch(() => null);
		if (!heights) return flat();
		// Cesium needs a height for every sample, so no data becomes sea level.
		heights.forEach((h, i) => Number.isNaN(h) && (heights[i] = 0));
		return toCesiumGrid(heights, (x % 2 ** up) * span, (y % 2 ** up) * span, span);
	}
});

// The default geocoder and base layer picker call Cesium ion, which needs its own token.
const viewer = new Cesium.Viewer('cesiumContainer', {
	baseLayer: false,
	geocoder: false,
	baseLayerPicker: false,
	terrainProvider
});
viewer.scene.verticalExaggeration = 3;

const [minX, minY, maxX] = TERRAINRGB_EXTENT;
viewer.camera.flyTo({
	destination: Cesium.Cartesian3.fromDegrees((minX + maxX) / 2, minY - 0.15, 25000),
	orientation: {
		heading: Cesium.Math.toRadians(0),
		pitch: Cesium.Math.toRadians(-30),
		roll: 0
	}
});

fetchWmtsTileTemplate(PRODUCT_ID, PRODUCT_TYPE, LAYER_IMAGE_FORMAT).then((raster) => {
	viewer.imageryLayers.addImageryProvider(
		new Cesium.WebMapTileServiceImageryProvider({
			url: new Cesium.Resource({ url: raster.template, queryParameters: { token: TOKEN } }),
			layer: raster.name,
			style: 'default',
			format: LAYER_IMAGE_FORMAT,
			tileMatrixSetID: 'WorldCRS84',
			tilingScheme: new Cesium.GeographicTilingScheme()
		})
	);
});
