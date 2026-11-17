'use strict';
import { TOKEN } from './config/common-config.js';
import { PRODUCT_ID, PRODUCT_TYPE, LAYER_IMAGE_FORMAT } from './config/raster-config.js';
import { fetchWmtsTileTemplate } from './utils/wmts-utils.js';

Promise.all([
	fetchWmtsTileTemplate(PRODUCT_ID, PRODUCT_TYPE, LAYER_IMAGE_FORMAT),
	fetchWmtsTileTemplate('OSM', 'RasterVectorBest', LAYER_IMAGE_FORMAT)
]).then(([main, second]) => {
	const viewer = new Cesium.Viewer('cesiumContainer', {
		baseLayer: new Cesium.ImageryLayer(
			new Cesium.WebMapTileServiceImageryProvider({
				url: new Cesium.Resource({
					url: main.template,
					queryParameters: {
						token: TOKEN
					}
				}),
				layer: main.name,
				style: 'default',
				format: LAYER_IMAGE_FORMAT,
				tileMatrixSetID: 'WorldCRS84',
				tilingScheme: new Cesium.GeographicTilingScheme()
			})
		),
		baseLayerPicker: false,
		infoBox: false
	});

	const layers = viewer.imageryLayers;
	const secondLayer = layers.addImageryProvider(
		new Cesium.WebMapTileServiceImageryProvider({
			url: new Cesium.Resource({
				url: second.template,
				queryParameters: {
					token: TOKEN
				}
			}),
			layer: second.name,
			style: 'default',
			format: LAYER_IMAGE_FORMAT,
			tileMatrixSetID: 'WorldCRS84',
			tilingScheme: new Cesium.GeographicTilingScheme()
		})
	);
	secondLayer.splitDirection = Cesium.SplitDirection.LEFT; // Only show to the left of the slider.

	// Sync the position of the slider with the split position
	const slider = document.getElementById('slider');
	viewer.scene.splitPosition = slider.offsetLeft / slider.parentElement.offsetWidth;

	const handler = new Cesium.ScreenSpaceEventHandler(slider);

	let moveActive = false;

	function move(movement) {
		if (!moveActive) {
			return;
		}

		const relativeOffset = movement.endPosition.x;
		const splitPosition = (slider.offsetLeft + relativeOffset) / slider.parentElement.offsetWidth;
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
});
