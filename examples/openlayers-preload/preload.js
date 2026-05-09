import { TOKEN } from './config/common-config.js';
import { LAYER_NAME, WMTS_CAPABILITIES_URL } from './config/raster-config.js';

const WMTSParser = new ol.format.WMTSCapabilities();

const sharedView = new ol.View({
  center: [0, 0],
  zoom: 0,
  projection: 'EPSG:4326',
});

fetch(WMTS_CAPABILITIES_URL)
	.then(response => response.text())
	.then(text => {
		const results = WMTSParser.read(text);
		const options = ol.source.WMTS.optionsFromCapabilities(results, {
			layer: LAYER_NAME
		});
		options.urls = options.urls.map(url => {
			return url.concat(`?token=${TOKEN}`);
		});
		const layerNoPreload = new ol.layer.Tile({ opacity: 1, source: new ol.source.WMTS(options) });
    const layerPreload = new ol.layer.Tile({ opacity: 1, source: new ol.source.WMTS(options), preload: 10 });

      const mapPreload = new ol.Map({
        target: 'map-preload',
        layers: [layerPreload],
        view: sharedView,
      });
      const mapNoPreload = new ol.Map({
        target: 'map-no-preload',
        layers: [layerNoPreload],
        view: sharedView,
      });
	});
