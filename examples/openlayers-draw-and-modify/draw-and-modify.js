import { TOKEN } from './config/common-config.js';
import { PRODUCT_ID, PRODUCT_TYPE, RASTER_SCHEME } from './config/raster-config.js';
import { fetchServiceLink } from './utils/catalog-client.js';

const map = new ol.Map({
	layers: [],
	target: 'map',
	view: new ol.View({
		center: [0, 0],
		zoom: 0,
		projection: 'EPSG:4326'
	})
});

const WMTSParser = new ol.format.WMTSCapabilities();

const source = new ol.source.Vector();

const style = new ol.style.Style({
	fill: new ol.style.Fill({
		color: 'rgba(255, 255, 255, 0.2)'
	}),
	stroke: new ol.style.Stroke({
		color: '#33cc33',
		width: 2
	}),
	image: new ol.style.Circle({
		radius: 7,
		fill: new ol.style.Fill({
			color: '#ffcc33'
		})
	})
});

const geodesicStyle = new ol.style.Style({
	geometry: function (feature) {
		return feature.get('modifyGeometry') || feature.getGeometry();
	},
	fill: new ol.style.Fill({
		color: 'rgba(255, 255, 255, 0.2)'
	}),
	stroke: new ol.style.Stroke({
		color: '#ff3333',
		width: 2
	}),
	image: new ol.style.Circle({
		radius: 7,
		fill: new ol.style.Fill({
			color: 'rgba(0, 0, 0, 0)'
		})
	})
});

const vector = new ol.layer.Vector({
	source: source,
	style: function (feature) {
		const geometry = feature.getGeometry();
		return geometry.getType() === 'GeometryCollection' ? geodesicStyle : style;
	}
});

const defaultStyle = new ol.interaction.Modify({ source: source }).getOverlay().getStyleFunction();

const modify = new ol.interaction.Modify({
	source: source,
	style: function (feature) {
		feature.get('features').forEach(function (modifyFeature) {
			const modifyGeometry = modifyFeature.get('modifyGeometry');
			if (modifyGeometry) {
				const modifyPoint = feature.getGeometry().getCoordinates();
				const geometries = modifyFeature.getGeometry().getGeometries();
				const polygon = geometries[0].getCoordinates()[0];
				const center = geometries[1].getCoordinates();
				const projection = map.getView().getProjection();
				let first, last, radius;
				if (modifyPoint[0] === center[0] && modifyPoint[1] === center[1]) {
					// center is being modified
					// get unchanged radius from diameter between polygon vertices
					first = ol.proj.transform(polygon[0], projection, 'EPSG:4326');
					last = ol.proj.transform(polygon[(polygon.length - 1) / 2], projection, 'EPSG:4326');
					radius = ol.sphere.getDistance(first, last) / 2;
				} else {
					// radius is being modified
					first = ol.proj.transform(center, projection, 'EPSG:4326');
					last = ol.proj.transform(modifyPoint, projection, 'EPSG:4326');
					radius = ol.sphere.getDistance(first, last);
				}
				// update the polygon using new center or radius
				const circle = ol.geom.Circle(
					ol.proj.transform(center, projection, 'EPSG:4326'),
					radius,
					128
				);
				circle.transform('EPSG:4326', projection);
				geometries[0].setCoordinates(circle.getCoordinates());
				// save changes to be applied at the end of the interaction
				modifyGeometry.setGeometries(geometries);
			}
		});
		return defaultStyle(feature);
	}
});

modify.on('modifystart', function (event) {
	event.features.forEach(function (feature) {
		const geometry = feature.getGeometry();
		if (geometry.getType() === 'GeometryCollection') {
			feature.set('modifyGeometry', geometry.clone(), true);
		}
	});
});

modify.on('modifyend', function (event) {
	event.features.forEach(function (feature) {
		const modifyGeometry = feature.get('modifyGeometry');
		if (modifyGeometry) {
			feature.setGeometry(modifyGeometry);
			feature.unset('modifyGeometry', true);
		}
	});
});

map.addInteraction(modify);

let draw, snap; // global so we can remove them later
const typeSelect = document.getElementById('type');

function addInteractions() {
	let value = typeSelect.value;
	let geometryFunction;
	if (value === 'Geodesic') {
		value = 'Circle';
		geometryFunction = function (coordinates, geometry, projection) {
			if (!geometry) {
				geometry = new ol.geom.GeometryCollection([
					new ol.geom.Polygon([]),
					new ol.geom.Point(coordinates[0])
				]);
			}
			const geometries = geometry.getGeometries();
			const center = ol.proj.transform(coordinates[0], projection, 'EPSG:4326');
			const last = ol.proj.transform(coordinates[1], projection, 'EPSG:4326');
			const radius = ol.sphere.getDistance(center, last);
			const circle = ol.geom.Polygon.circular(center, radius, 128);
			circle.transform('EPSG:4326', projection);
			geometries[0].setCoordinates(circle.getCoordinates());
			geometry.setGeometries(geometries);
			return geometry;
		};
	}
	draw = new ol.interaction.Draw({
		source: source,
		type: value,
		geometryFunction: geometryFunction
	});
	map.addInteraction(draw);
	snap = new ol.interaction.Snap({ source: source });
	map.addInteraction(snap);
}

/**
 * Handle change event.
 */
typeSelect.onchange = function () {
	map.removeInteraction(draw);
	map.removeInteraction(snap);
	addInteractions();
};

addInteractions();

fetchServiceLink('raster', PRODUCT_ID, PRODUCT_TYPE, RASTER_SCHEME)
	.then((url) => fetch(`${url}?token=${TOKEN}`))
	.then((response) => response.text())
	.then((text) => {
		const results = WMTSParser.read(text);
		const options = ol.source.WMTS.optionsFromCapabilities(results, {
			layer: `${PRODUCT_ID}-${PRODUCT_TYPE}`
		});
		options.urls = options.urls.map((url) => {
			return url.concat(`?token=${TOKEN}`);
		});
		const layer = new ol.layer.WebGLTile({ opacity: 1, source: new ol.source.WMTS(options) });
		map.addLayer(layer);
		map.addLayer(vector);
	});
