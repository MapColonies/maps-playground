import { TOKEN } from './config/common-config.js';
import { LAYER_NAME, RASTER_SERVICE_URL } from './config/raster-config.js';

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
    tileMatrixSetID: "WorldCRS84",
    tilingScheme: new Cesium.GeographicTilingScheme()
  }),
});
