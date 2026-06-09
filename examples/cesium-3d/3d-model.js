import { TOKEN } from './config/common-config.js';
import {
	PRODUCT_ID as RASTER_PRODUCT_ID,
	PRODUCT_TYPE as RASTER_PRODUCT_TYPE,
	LAYER_IMAGE_FORMAT
} from './config/raster-config.js';
import {
	PRODUCT_ID as DEM_PRODUCT_ID,
	PRODUCT_TYPE as DEM_PRODUCT_TYPE,
	DEM_SCHEME
} from './config/dem-config.js';
import {
	PRODUCT_ID as MODEL_3D_PRODUCT_ID,
	PRODUCT_TYPE as MODEL_3D_PRODUCT_TYPE,
	MODEL_3D_SCHEME
} from './config/3d-config.js';
import { fetchServiceLink } from './utils/catalog-client.js';
import { fetchWmtsTileTemplate } from './utils/wmts-utils.js';

Promise.all([
	fetchWmtsTileTemplate(RASTER_PRODUCT_ID, RASTER_PRODUCT_TYPE, LAYER_IMAGE_FORMAT),
	fetchServiceLink('dem', DEM_PRODUCT_ID, DEM_PRODUCT_TYPE, DEM_SCHEME),
	fetchServiceLink('3d', MODEL_3D_PRODUCT_ID, MODEL_3D_PRODUCT_TYPE, MODEL_3D_SCHEME)
]).then(([raster, dem, model]) => {
	const viewer = new Cesium.Viewer('cesiumContainer', {
		imageryProvider: new Cesium.WebMapTileServiceImageryProvider({
			url: new Cesium.Resource({
				url: raster.template,
				queryParameters: {
					token: TOKEN
				}
			}),
			layer: raster.name,
			style: 'default',
			format: LAYER_IMAGE_FORMAT,
			tileMatrixSetID: 'WorldCRS84',
			tilingScheme: new Cesium.GeographicTilingScheme()
		}),
		terrainProvider: new Cesium.CesiumTerrainProvider({
			url: new Cesium.Resource({
				url: dem.url,
				queryParameters: {
					token: TOKEN
				}
			})
		})
	});

	viewer.scene.primitives.add(
		new Cesium.Cesium3DTileset({
			url: new Cesium.Resource({
				url: model.url,
				queryParameters: {
					token: TOKEN
				}
			}),
			maximumScreenSpaceError: 5,
			cullRequestsWhileMovingMultiplier: 120,
			preloadFlightDestination: true,
			preferLeaves: true,
			skipLevelOfDetail: true
		})
	);

	viewer.camera.flyTo({
		destination: Cesium.Cartesian3.fromDegrees(35.201436, 33.265378, 300),
		orientation: {
			heading: Cesium.Math.toRadians(25.0),
			pitch: Cesium.Math.toRadians(-10.0),
			roll: 0.0
		}
	});
});
