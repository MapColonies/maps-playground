import { TOKEN } from './config/common-config.js';
import { RASTER_SERVICE_URL, LAYER_NAME, LAYER_IMAGE_FORMAT } from './config/raster-config.js';
import { DEM_URL } from './config/dem-config.js';
import { MODEL_3D_URL } from './config/3d-config.js';

const viewer = new Cesium.Viewer("cesiumContainer", {
  imageryProvider: new Cesium.WebMapTileServiceImageryProvider({
    url: new Cesium.Resource({
      url: RASTER_SERVICE_URL,
      queryParameters: {
        token: TOKEN
      }
    }),
    layer: LAYER_NAME,
    style: "default",
    format: LAYER_IMAGE_FORMAT,
    tileMatrixSetID: "WorldCRS84",
    tilingScheme: new Cesium.GeographicTilingScheme()
  }),
   terrainProvider: new Cesium.CesiumTerrainProvider({
    url: new Cesium.Resource({
      url: DEM_URL,
      queryParameters: {
        token: TOKEN
      }
    })
  }),
});

viewer.scene.primitives.add(new Cesium.Cesium3DTileset({
  url: new Cesium.Resource({
      url: MODEL_3D_URL,
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
