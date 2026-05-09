"use strict";
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
  baseLayerPicker: false,
  infoBox: false,
});

const layers = viewer.imageryLayers;
const secondLayer = layers.addImageryProvider(
  new Cesium.WebMapTileServiceImageryProvider({
    url: new Cesium.Resource({
      url: RASTER_SERVICE_URL,
      queryParameters: {
        token: TOKEN
      }
    }),
    layer: "OSM-RasterVectorBest",
    style: "default",
    format: "image/png",
    tileMatrixSetID: "WorldCRS84",
    tilingScheme: new Cesium.GeographicTilingScheme()
  }),
);
secondLayer.splitDirection = Cesium.SplitDirection.LEFT; // Only show to the left of the slider.

// Sync the position of the slider with the split position
const slider = document.getElementById("slider");
viewer.scene.splitPosition =
  slider.offsetLeft / slider.parentElement.offsetWidth;

const handler = new Cesium.ScreenSpaceEventHandler(slider);

let moveActive = false;

function move(movement) {
  if (!moveActive) {
	return;
  }

  const relativeOffset = movement.endPosition.x;
  const splitPosition =
	(slider.offsetLeft + relativeOffset) /
	slider.parentElement.offsetWidth;
  slider.style.left = `${100.0 * splitPosition}%`;
  viewer.scene.splitPosition = splitPosition;
}

handler.setInputAction(function () {
  moveActive = true;
}, Cesium.ScreenSpaceEventType.LEFT_DOWN);
handler.setInputAction(function () {
  moveActive = true;
}, Cesium.ScreenSpaceEventType.PINCH_START);

handler.setInputAction(move, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
handler.setInputAction(move, Cesium.ScreenSpaceEventType.PINCH_MOVE);

handler.setInputAction(function () {
  moveActive = false;
}, Cesium.ScreenSpaceEventType.LEFT_UP);
handler.setInputAction(function () {
  moveActive = false;
}, Cesium.ScreenSpaceEventType.PINCH_END);
