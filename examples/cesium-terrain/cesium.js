import { TOKEN } from './config/common-config.js';
import { PRODUCT_ID as RASTER_PRODUCT_ID, PRODUCT_TYPE as RASTER_PRODUCT_TYPE, LAYER_IMAGE_FORMAT } from './config/raster-config.js';
import { PRODUCT_ID as DEM_PRODUCT_ID, PRODUCT_TYPE as DEM_PRODUCT_TYPE, DEM_SCHEME } from './config/dem-config.js';
import { fetchServiceLink } from './utils/catalog-client.js';
import { fetchWmtsTileTemplate } from './utils/wmts-utils.js';

Promise.all([
  fetchWmtsTileTemplate(RASTER_PRODUCT_ID, RASTER_PRODUCT_TYPE, LAYER_IMAGE_FORMAT),
  fetchServiceLink('dem', DEM_PRODUCT_ID, DEM_PRODUCT_TYPE, DEM_SCHEME),
]).then(([tileTemplate, demUrl]) => {
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
      tileMatrixSetID: "newGrids",
      tilingScheme: new Cesium.GeographicTilingScheme()
    }),
    terrainProvider: new Cesium.CesiumTerrainProvider({
      url: new Cesium.Resource({
        url: demUrl,
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

  fetchWmtsTileTemplate('WORLD_MAP_BASE_THIN', 'RasterVectorBest', 'image/png').then(secondTemplate => {
    viewer.imageryLayers.addImageryProvider(new Cesium.WebMapTileServiceImageryProvider({
      url: new Cesium.Resource({
        url: secondTemplate,
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
  });
});
