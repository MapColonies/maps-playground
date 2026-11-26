import { TERRAINRGB_MAX_LEVEL, TERRAINRGB_EXTENT } from './config/dem-config.js';
import { TILE_SIZE, fetchHeights, rampColour } from './utils/terrainrgb-utils.js';

// An empty extent ('', [] or null) means the whole world.
const extent = TERRAINRGB_EXTENT?.length ? TERRAINRGB_EXTENT : undefined;
const bounds = extent && [
	[extent[1], extent[0]],
	[extent[3], extent[2]]
];
const tiles = new Map();

const TerrainRgbLayer = L.GridLayer.extend({
	createTile(coords, done) {
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = TILE_SIZE;
		fetchHeights(coords.z, coords.x, coords.y)
			.then((heights) => {
				if (heights) {
					tiles.set(`${coords.z}/${coords.x}/${coords.y}`, heights);
					const ctx = canvas.getContext('2d');
					const image = ctx.createImageData(TILE_SIZE, TILE_SIZE);
					heights.forEach((h, i) => {
						if (!Number.isNaN(h)) image.data.set([...rampColour(h), 255], 4 * i);
					});
					ctx.putImageData(image, 0, 0);
				}
				done(null, canvas);
			})
			.catch((error) => done(error, canvas));
		return canvas;
	}
});

// L.CRS.EPSG4326 zoom 0 is 2 x 1 tiles of 256 px, the same grid as WorldCRS84.
const map = L.map('map', { crs: L.CRS.EPSG4326, maxZoom: TERRAINRGB_MAX_LEVEL + 3 });
if (bounds) map.fitBounds(bounds);
else map.setView([0, 0], 0);
new TerrainRgbLayer({ maxNativeZoom: TERRAINRGB_MAX_LEVEL, bounds }).addTo(map);

const info = document.getElementById('info');
map.on('mousemove', (event) => {
	const z = Math.min(map.getZoom(), TERRAINRGB_MAX_LEVEL);
	const point = map.project(event.latlng, z);
	const heights = tiles.get(
		`${z}/${Math.floor(point.x / TILE_SIZE)}/${Math.floor(point.y / TILE_SIZE)}`
	);
	const h =
		heights?.[Math.floor(point.y % TILE_SIZE) * TILE_SIZE + Math.floor(point.x % TILE_SIZE)];
	if (h === undefined || Number.isNaN(h)) {
		info.textContent = 'no data';
		return;
	}
	info.textContent = `${h.toFixed(1)} m at ${event.latlng.lat.toFixed(
		4
	)}, ${event.latlng.lng.toFixed(4)}`;
});
