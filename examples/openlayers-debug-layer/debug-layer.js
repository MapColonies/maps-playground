import { TOKEN } from './config/common-config.js';
import { LAYER_NAME, WMTS_CAPABILITIES_URL } from './config/raster-config.js';

const map = new ol.Map({
	target: 'map',
	view: new ol.View({
		center: [0, 0],
		zoom: 0,
		projection: 'EPSG:4326',
	}),
});

const WMTSParser = new ol.format.WMTSCapabilities();

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
		const layer = new ol.layer.WebGLTile({ opacity: 1, source: new ol.source.WMTS(options) });
		map.addLayer(layer);

      const debugLayer = new ol.layer.WebGLTile({
        source: new ol.source.TileDebug({
          template: 'z:{z} x:{x}, y:{y}',
          projection: layer.getSource().getProjection(),
          tileGrid: layer.getSource().getTileGrid(),
          zDirection: 1
        })
      });
      map.addLayer(debugLayer);

	});
