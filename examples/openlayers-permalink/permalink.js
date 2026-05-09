import { TOKEN } from './config/common-config.js';
import { LAYER_NAME, WMTS_CAPABILITIES_URL } from './config/raster-config.js';

// default zoom, center and rotation
let zoom = 2;
let center = [0, 0];
let rotation = 0;

if (window.location.hash !== '') {
  // try to restore center, zoom-level and rotation from the URL
  const hash = window.location.hash.replace('#map=', '');
  const parts = hash.split('/');
  if (parts.length === 4) {
    zoom = parseFloat(parts[0]);
    center = [parseFloat(parts[1]), parseFloat(parts[2])];
    rotation = parseFloat(parts[3]);
  }
}

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
		const layer = new ol.layer.Tile({ opacity: 1, source: new ol.source.WMTS(options) });
        const map = new ol.Map({
            target: 'map',
            view: new ol.View({
                center: center,
                zoom: zoom,
                rotation: rotation,
                projection: 'EPSG:4326',
            }),
        });
        map.addLayer(layer);

        let shouldUpdate = true;
        const view = map.getView();
        const updatePermalink = function () {
        if (!shouldUpdate) {
            // do not update the URL when the view was changed in the 'popstate' handler
            shouldUpdate = true;
            return;
        }

        const center = view.getCenter();
        const hash =
            '#map=' +
            view.getZoom().toFixed(2) +
            '/' +
            center[0].toFixed(2) +
            '/' +
            center[1].toFixed(2) +
            '/' +
            view.getRotation();
        const state = {
            zoom: view.getZoom(),
            center: view.getCenter(),
            rotation: view.getRotation(),
        };
        window.history.pushState(state, 'map', hash);
        };

        map.on('moveend', updatePermalink);

        // restore the view state when navigating through the history, see
        // https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onpopstate
        window.addEventListener('popstate', function (event) {
        if (event.state === null) {
            return;
        }
        map.getView().setCenter(event.state.center);
        map.getView().setZoom(event.state.zoom);
        map.getView().setRotation(event.state.rotation);
        shouldUpdate = false;
        });

    });
