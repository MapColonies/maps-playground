import { TOKEN } from './config/common-config.js';
import { PRODUCT_ID, PRODUCT_TYPE, RASTER_SCHEME } from './config/raster-config.js';
import { fetchServiceLink } from './utils/catalog-client.js';

const WMTSParser = new ol.format.WMTSCapabilities();

const sharedView = new ol.View({
	center: [0, 0],
	zoom: 0,
	projection: 'EPSG:4326'
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
		const layerNoPreload = new ol.layer.Tile({ opacity: 1, source: new ol.source.WMTS(options) });
		const layerPreload = new ol.layer.Tile({
			opacity: 1,
			source: new ol.source.WMTS(options),
			preload: 10
		});

		const mapPreload = new ol.Map({
			target: 'map-preload',
			layers: [layerPreload],
			view: sharedView
		});
		const mapNoPreload = new ol.Map({
			target: 'map-no-preload',
			layers: [layerNoPreload],
			view: sharedView
		});
	});
