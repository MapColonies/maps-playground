import { TOKEN } from './config/common-config.js';
import { RASTER_SERVICE_URL, LAYER_NAME, LAYER_IMAGE_FORMAT } from './config/raster-config.js';

const viewer = new Cesium.Viewer('cesiumContainer', {
	imageryProvider: new Cesium.WebMapTileServiceImageryProvider({
		url: new Cesium.Resource({
			url: RASTER_SERVICE_URL,
			queryParameters: {
				token: TOKEN
			}
		}),
		layer: LAYER_NAME,
		style: 'default',
		format: LAYER_IMAGE_FORMAT,
		tileMatrixSetID: 'WorldCRS84',
		tilingScheme: new Cesium.GeographicTilingScheme()
	})
});
