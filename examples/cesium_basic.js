const viewer = new Cesium.Viewer('cesiumContainer', {});

const osm = new Cesium.OpenStreetMapImageryProvider({
  url: 'https://a.tile.openstreetmap.org/',
});

viewer.imageryLayers.addImageryProvider(osm);

viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(-122.4175, 37.655, 400),
  orientation: {
    heading: Cesium.Math.toRadians(0.0),
    pitch: Cesium.Math.toRadians(-15.0),
  },
});
