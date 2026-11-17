import { TOKEN } from './config/common-config.js';
import { TERRAINRGB_URL, TERRAINRGB_MAX_LEVEL, TERRAINRGB_EXTENT } from './config/dem-config.js';

const maplibregl = await import(
	`${location.origin}/libs/maplibre-gl-crs84/6.7.0-rc.1/maplibre-gl.mjs`
);

const EXAGGERATION = 2;
const dem = {
	type: 'raster-dem',
	tiles: [`${TERRAINRGB_URL}?token=${TOKEN}`],
	tileSize: 256,
	encoding: 'mapbox',
	bounds: TERRAINRGB_EXTENT,
	maxzoom: TERRAINRGB_MAX_LEVEL
};

// Global setting: must be called before any map is created. WorldCRS84Quad is the fork's default.
maplibregl.setWorldCRS('WorldCRS84Quad');

const map = new maplibregl.Map({
	container: 'map',
	style: {
		version: 8,
		sources: { dem, terrain: dem },
		layers: [
			{
				id: 'relief',
				type: 'color-relief',
				source: 'dem',
				paint: {
					'color-relief-color': [
						'interpolate',
						['linear'],
						['elevation'],
						0,
						'#41ab5d',
						200,
						'#addd8e',
						400,
						'#fee08b',
						700,
						'#d7783c'
					]
				}
			},
			{ id: 'hillshade', type: 'hillshade', source: 'dem' }
		],
		terrain: { source: 'terrain', exaggeration: EXAGGERATION }
	},
	bounds: TERRAINRGB_EXTENT,
	pitch: 60,
	maxPitch: 85
});
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }));
map.addControl(new maplibregl.TerrainControl({ source: 'terrain', exaggeration: EXAGGERATION }));

const label = document.getElementById('info');
map.on('mousemove', (e) => {
	const h = map.queryTerrainElevation(e.lngLat);
	const terrain = map.getTerrain();
	// queryTerrainElevation includes the terrain exaggeration.
	label.textContent = h == null || !terrain ? '' : `${(h / terrain.exaggeration).toFixed(1)} m`;
});
