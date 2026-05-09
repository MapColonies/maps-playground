const viewer = new Cesium.Viewer('cesiumContainer', {
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
    tileMatrixSetID: "",
    tilingScheme: new Cesium.GeographicTilingScheme()
  }),
});
