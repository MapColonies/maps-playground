import { TOKEN } from './config/common-config.js';
import { PRODUCT_ID as RASTER_PRODUCT_ID, PRODUCT_TYPE as RASTER_PRODUCT_TYPE, LAYER_IMAGE_FORMAT } from './config/raster-config.js';
import { PRODUCT_ID as DEM_PRODUCT_ID, PRODUCT_TYPE as DEM_PRODUCT_TYPE } from './config/dem-config.js';
import { PRODUCT_ID as MODEL_3D_PRODUCT_ID, PRODUCT_TYPE as MODEL_3D_PRODUCT_TYPE } from './config/3d-config.js';
import { fetchServiceLink } from './utils/catalog-client.js';
import { fetchWmtsTileTemplate } from './utils/wmts-utils.js';

Promise.all([
  fetchWmtsTileTemplate(RASTER_PRODUCT_ID, RASTER_PRODUCT_TYPE, LAYER_IMAGE_FORMAT),
  fetchServiceLink('dem', DEM_PRODUCT_ID, DEM_PRODUCT_TYPE, 'WCS'),
  fetchServiceLink('3d', MODEL_3D_PRODUCT_ID, MODEL_3D_PRODUCT_TYPE, '3DTiles'),
]).then(([tileTemplate, demUrl, modelUrl]) => {
  const viewer = new Cesium.Viewer("cesiumContainer", {
    imageryProvider: new Cesium.WebMapTileServiceImageryProvider({
      url: new Cesium.Resource({
        url: tileTemplate,
        queryParameters: {
          token: TOKEN
        }
      }),
      layer: `${RASTER_PRODUCT_ID}-${RASTER_PRODUCT_TYPE}`,
      style: "default",
      format: LAYER_IMAGE_FORMAT,
      tileMatrixSetID: "WorldCRS84",
      tilingScheme: new Cesium.GeographicTilingScheme()
    }),
    terrainProvider: new Cesium.CesiumTerrainProvider({
      url: new Cesium.Resource({
        url: demUrl,
        queryParameters: {
          token: TOKEN
        }
      })
    }),
  });

  viewer.scene.primitives.add(new Cesium.Cesium3DTileset({
    url: new Cesium.Resource({
      url: modelUrl,
      queryParameters: {
        token: TOKEN
      }
    }),
    maximumScreenSpaceError: 5,
    cullRequestsWhileMovingMultiplier: 120,
    preloadFlightDestination: true,
    preferLeaves: true,
    skipLevelOfDetail: true
  }));

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(35.201436, 33.265378, 300),
    orientation: {
      heading: Cesium.Math.toRadians(25.0),
      pitch: Cesium.Math.toRadians(-10.0),
      roll: 0.0
    }
  });
});
