import { TOKEN } from './config/common-config.js';
import {
	PRODUCT_ID as RASTER_PRODUCT_ID,
	PRODUCT_TYPE as RASTER_PRODUCT_TYPE,
	LAYER_IMAGE_FORMAT
} from './config/raster-config.js';
import {
	TERRAIN_PRODUCT_ID as DEM_TERRAIN_PRODUCT_ID,
	TERRAIN_PRODUCT_TYPE as DEM_TERRAIN_PRODUCT_TYPE,
	DEM_TERRAIN_SCHEME
} from './config/dem-config.js';
import { fetchServiceLink } from './utils/catalog-client.js';
import { fetchWmtsTileTemplate } from './utils/wmts-utils.js';

Promise.all([
	fetchWmtsTileTemplate(RASTER_PRODUCT_ID, RASTER_PRODUCT_TYPE, LAYER_IMAGE_FORMAT),
	fetchServiceLink('3d', DEM_TERRAIN_PRODUCT_ID, DEM_TERRAIN_PRODUCT_TYPE, DEM_TERRAIN_SCHEME)
]).then(async ([raster, dem]) => {
	const terrainProvider = await Cesium.CesiumTerrainProvider.fromUrl(
		new Cesium.Resource({
			url: dem.url,
			queryParameters: { token: TOKEN }
		})
	);

	const viewer = new Cesium.Viewer('cesiumContainer', {
		baseLayer: new Cesium.ImageryLayer(
			new Cesium.WebMapTileServiceImageryProvider({
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
			})
		),
		terrainProvider
	});

	viewer.camera.flyTo({
		destination: Cesium.Cartesian3.fromDegrees(35.567306, 33.210784, 6000),
		orientation: {
			heading: Cesium.Math.toRadians(25.0),
			pitch: Cesium.Math.toRadians(-10.0),
			roll: 0.0
		}
	});
});
