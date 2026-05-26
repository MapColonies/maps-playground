import { TOKEN } from './config/common-config.js';
import { WMTS_CAPABILITIES_URL, LAYER_NAME, ADDITIONAL_LAYER_NAME } from './config/raster-config.js';

const WMTSParser = new ol.format.WMTSCapabilities();

fetch(WMTS_CAPABILITIES_URL)
    .then(response => response.text())
    .then(text => {
        const results = WMTSParser.read(text);
        const options = ol.source.WMTS.optionsFromCapabilities(results, {
            layer: LAYER_NAME
        });
        const optionsMiniMap = ol.source.WMTS.optionsFromCapabilities(results, {
            layer: ADDITIONAL_LAYER_NAME
        });
        options.urls = options.urls.map(url => {
            return url.concat(`?token=${TOKEN}`);
        });
        optionsMiniMap.urls = optionsMiniMap.urls.map(url => {
            return url.concat(`?token=${TOKEN}`);
        });
        let rasterLayer = new ol.layer.Tile({ opacity: 1, source: new ol.source.WMTS(options), preload: 10 });
        let rasterLayer2 = new ol.layer.Tile({ opacity: 1, source: new ol.source.WMTS(optionsMiniMap) });
        const overviewMapControl = new ol.control.OverviewMap({layers: [rasterLayer2], collapsed: false});

        const map = new ol.Map({
          controls: ol.control.defaults.defaults().extend([overviewMapControl]),
          target: 'map',
          layers: [rasterLayer],
          view: new ol.View({
            center: [34.465798, 31.513991],
            zoom: 18,
            projection: 'EPSG:4326',
            minZoom: 1,
          }),
        });

    });
