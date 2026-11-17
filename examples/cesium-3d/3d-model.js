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
import {
	PRODUCT_ID as MODEL_3D_PRODUCT_ID,
	PRODUCT_TYPE as MODEL_3D_PRODUCT_TYPE,
	MODEL_3D_SCHEME
} from './config/3d-config.js';
import { fetchServiceLink } from './utils/catalog-client.js';
import { fetchWmtsTileTemplate } from './utils/wmts-utils.js';

Promise.all([
	fetchWmtsTileTemplate(RASTER_PRODUCT_ID, RASTER_PRODUCT_TYPE, LAYER_IMAGE_FORMAT),
	fetchServiceLink('3d', DEM_TERRAIN_PRODUCT_ID, DEM_TERRAIN_PRODUCT_TYPE, DEM_TERRAIN_SCHEME),
	fetchServiceLink('3d', MODEL_3D_PRODUCT_ID, MODEL_3D_PRODUCT_TYPE, MODEL_3D_SCHEME)
]).then(async ([raster, dem, model]) => {
	const demResource = new Cesium.Resource({
		url: dem.url,
		queryParameters: { token: TOKEN }
	});
	const modelResource = new Cesium.Resource({
		url: model.url,
		queryParameters: { token: TOKEN }
	});

	const [terrainProvider, tileset] = await Promise.all([
		Cesium.CesiumTerrainProvider.fromUrl(demResource),
		Cesium.Cesium3DTileset.fromUrl(modelResource, {
			maximumScreenSpaceError: 5,
			cullRequestsWhileMovingMultiplier: 120,
			preloadFlightDestination: true,
			preferLeaves: true,
			skipLevelOfDetail: true
		})
	]);

	const viewer = new Cesium.Viewer('cesiumContainer', {
		baseLayer: new Cesium.ImageryLayer(
			new Cesium.WebMapTileServiceImageryProvider({
				url: new Cesium.Resource({
					url: raster.template,
					queryParameters: { token: TOKEN }
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

	viewer.scene.primitives.add(tileset);

	viewer.camera.flyTo({
		destination: Cesium.Cartesian3.fromDegrees(34.28735, 31.33365, 300),
		orientation: {
			heading: Cesium.Math.toRadians(25.0),
			pitch: Cesium.Math.toRadians(-10.0),
			roll: 0.0
		}
	});
});
