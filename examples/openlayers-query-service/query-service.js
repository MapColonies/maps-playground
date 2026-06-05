import { TOKEN } from './config/common-config.js';
import { PRODUCT_ID, PRODUCT_TYPE, RASTER_SCHEME } from './config/raster-config.js';
import { VECTOR_WFS_URL } from './config/vector-config.js';
import { fetchServiceLink } from './utils/catalog-client.js';

const map = new ol.Map({
	target: 'map',
	view: new ol.View({
		center: [34.465798, 31.513991],
		zoom: 18,
		projection: 'EPSG:4326'
	})
});

const WMTSParser = new ol.format.WMTSCapabilities();
let rasterLayer;

const vectorSource = new ol.source.Vector({
	format: new ol.format.GeoJSON(),
	strategy: ol.loadingstrategy.tile(ol.tilegrid.createXYZ({ tileSize: 512 })),
	url: function (extent) {
		return (
			VECTOR_WFS_URL +
			`?service=WFS&version=2.0.0&request=GetFeature&typeName=core:buildings_polygon&srsname=EPSG:4326&bbox=${extent.join(
				','
			)},EPSG:4326&token=${TOKEN}&outputFormat=application/json&maxFeatures=10000`
		);
	}
});

const vector = new ol.layer.Vector({
	source: vectorSource,
	style: new ol.style.Style({
		stroke: new ol.style.Stroke({
			color: 'rgba(255,0,0,0.5)',
			width: 3
		}),
		fill: new ol.style.Fill({ color: 'rgba(255,50,0,0.5)' })
	}),
	minZoom: 15,
	maxZoom: 20
});

fetchServiceLink('raster', PRODUCT_ID, PRODUCT_TYPE, RASTER_SCHEME)
	.then((url) => fetch(`${url}?token=${TOKEN}`))
	.then((response) => response.text())
	.then((text) => {
		const results = WMTSParser.read(text);
		const options = ol.source.WMTS.optionsFromCapabilities(results, {
			layer: `${PRODUCT_ID}-${PRODUCT_TYPE}`
		});
		options.urls = options.urls.map((url) => {
			return url.concat(`?token=${TOKEN}`);
		});
		rasterLayer = new ol.layer.Tile({ opacity: 1, source: new ol.source.WMTS(options) });
		map.addLayer(rasterLayer);
		map.addLayer(vector);
	});
