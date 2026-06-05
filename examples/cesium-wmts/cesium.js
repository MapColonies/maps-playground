import { TOKEN } from './config/common-config.js';
import { PRODUCT_ID, PRODUCT_TYPE, LAYER_IMAGE_FORMAT } from './config/raster-config.js';
import { fetchWmtsTileTemplate } from './utils/wmts-utils.js';

fetchWmtsTileTemplate(PRODUCT_ID, PRODUCT_TYPE, LAYER_IMAGE_FORMAT).then((tileTemplate) => {
	new Cesium.Viewer('cesiumContainer', {
		imageryProvider: new Cesium.WebMapTileServiceImageryProvider({
			url: new Cesium.Resource({
				url: tileTemplate,
				queryParameters: {
					token: TOKEN
				}
			}),
			layer: `${PRODUCT_ID}-${PRODUCT_TYPE}`,
			style: 'default',
			format: LAYER_IMAGE_FORMAT,
			tileMatrixSetID: 'WorldCRS84',
			tilingScheme: new Cesium.GeographicTilingScheme()
		})
	});
});
