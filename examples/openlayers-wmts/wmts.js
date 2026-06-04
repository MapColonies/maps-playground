import { TOKEN } from './config/common-config.js';
import { PRODUCT_ID, PRODUCT_TYPE } from './config/raster-config.js';
import { fetchServiceLink } from './utils/catalog-client.js';

const WMTSParser = new ol.format.WMTSCapabilities();

const map = new ol.Map({
	target: 'map',
	view: new ol.View({
		center: [0, 0],
		zoom: 0,
		projection: 'EPSG:4326',
	}),
});

fetchServiceLink('raster', PRODUCT_ID, PRODUCT_TYPE, 'WMTS')
	.then(url => fetch(`${url}?token=${TOKEN}`))
	.then(response => response.text())
	.then(text => {
		const results = WMTSParser.read(text);
		const options = ol.source.WMTS.optionsFromCapabilities(results, {
			layer: `${PRODUCT_ID}-${PRODUCT_TYPE}`,
		});
		options.urls = options.urls.map(url => {
			return url.concat(`?token=${TOKEN}`);
		});
		const layer = new ol.layer.Tile({ opacity: 1, source: new ol.source.WMTS(options) });
		map.addLayer(layer);
	});
