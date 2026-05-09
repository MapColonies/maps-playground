import { TOKEN } from './config/common-config.js';
import { LAYER_NAME, RASTER_SERVICE_URL } from './config/raster-config.js';
import { DEM_URL } from './config/dem-config.js';

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
    format: "image/jpeg",
    tileMatrixSetID: "newGrids",
    tilingScheme: new Cesium.GeographicTilingScheme()
  }),
    terrainProvider: new Cesium.CesiumTerrainProvider({
    url: new Cesium.Resource({
      url: DEM_URL,
      queryParameters: {
        token: TOKEN
      }
    })
  })
});

viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(35.567306, 33.210784, 6000),
  orientation: {
    heading: Cesium.Math.toRadians(25.0),
    pitch: Cesium.Math.toRadians(-10.0),
    roll: 0.0
  }
});

viewer.imageryLayers.addImageryProvider(new Cesium.WebMapTileServiceImageryProvider({
    url: new Cesium.Resource({
      url: RASTER_SERVICE_URL,
      queryParameters: {
        token: TOKEN
      }
    }),
    layer: "WORLD_MAP_BASE_THIN-RasterVectorBest",
    style: "default",
    format: "image/png",
    tileMatrixSetID: "newGrids",
    tilingScheme: new Cesium.GeographicTilingScheme()
  }));
