import { TOKEN } from './config/common-config.js';
import { LAYER_NAME, WMTS_CAPABILITIES_URL } from './config/raster-config.js';

const WMTSParser = new ol.format.WMTSCapabilities();

const vectorSource = new ol.source.Vector({
  format: new ol.format.GeoJSON(),
  strategy: ol.loadingstrategy.tile(ol.tilegrid.createXYZ({tileSize: 256})),
  url: function(extent) {
    return VECTOR_WFS_URL + `?service=WFS&version=2.0.0&request=GetFeature&typeName=core:buildings_polygon&srsname=EPSG:4326&bbox=${extent.join(',')},EPSG:4326&token=${TOKEN}&outputFormat=application/json`;
  }
});

const style = new ol.style.Style({
  fill: new ol.style.Fill({
    color: '#eeeeee'
  }),
});

const map = new ol.Map({
  target: 'map',
    view: new ol.View({
    center: [34.465798, 31.513991],
    zoom: 18,
    projection: 'EPSG:4326',
    constrainRotation: 16,
  }),
});

const vectorLayer = new ol.layer.Vector({
      source: vectorSource,
      style: function (feature) {
        const color = feature.get('is_sensitive') === true ? 'red' : '#eeeeee';
        style.getFill().setColor(color);
        return style;
      },
    })


const selectedStyle = new ol.style.Style({
  fill: new ol.style.Fill({
    color: 'rgba(180, 2, 180, 0.3)',
  }),
  stroke: new ol.style.Stroke({
    color: 'rgba(180, 2, 180, 0.4)',
    width: 5,
  }),
});

// a normal select interaction to handle click
const select = new ol.interaction.Select({
  style: function (feature) {
    const color = feature.get('is_sensitive') === true ? 'red' : '#eeeeee';
    selectedStyle.getFill().setColor(color);
    return selectedStyle;
  },
});
map.addInteraction(select);

const selectedFeatures = select.getFeatures();

// a DragBox interaction used to select features by drawing boxes
const dragBox = new ol.interaction.DragBox({
  condition: ol.events.condition.platformModifierKeyOnly,
});

map.addInteraction(dragBox);

dragBox.on('boxend', function () {
  const boxExtent = dragBox.getGeometry().getExtent();

  // if the extent crosses the antimeridian process each world separately
  const worldExtent = map.getView().getProjection().getExtent();
  const worldWidth = ol.extent.getWidth(worldExtent);
  const startWorld = Math.floor((boxExtent[0] - worldExtent[0]) / worldWidth);
  const endWorld = Math.floor((boxExtent[2] - worldExtent[0]) / worldWidth);

  for (let world = startWorld; world <= endWorld; ++world) {
    const left = Math.max(boxExtent[0] - world * worldWidth, worldExtent[0]);
    const right = Math.min(boxExtent[2] - world * worldWidth, worldExtent[2]);
    const extent = [left, boxExtent[1], right, boxExtent[3]];

    const boxFeatures = vectorSource
      .getFeaturesInExtent(extent)
      .filter(
        (feature) =>
          !selectedFeatures.getArray().includes(feature) &&
          feature.getGeometry().intersectsExtent(extent)
      );

    // features that intersect the box geometry are added to the
    // collection of selected features

    // if the view is not obliquely rotated the box geometry and
    // its extent are equalivalent so intersecting features can
    // be added directly to the collection
    const rotation = map.getView().getRotation();
    const oblique = rotation % (Math.PI / 2) !== 0;

    // when the view is obliquely rotated the box extent will
    // exceed its geometry so both the box and the candidate
    // feature geometries are rotated around a common anchor
    // to confirm that, with the box geometry aligned with its
    // extent, the geometries intersect
    if (oblique) {
      const anchor = [0, 0];
      const geometry = dragBox.getGeometry().clone();
      geometry.translate(-world * worldWidth, 0);
      geometry.rotate(-rotation, anchor);
      const extent = geometry.getExtent();
      boxFeatures.forEach(function (feature) {
        const geometry = feature.getGeometry().clone();
        geometry.rotate(-rotation, anchor);
        if (geometry.intersectsExtent(extent)) {
          selectedFeatures.push(feature);
        }
      });
    } else {
      selectedFeatures.extend(boxFeatures);
    }
  }
});

// clear selection when drawing a new box and when clicking on the map
dragBox.on('boxstart', function () {
  selectedFeatures.clear();
});

const infoBox = document.getElementById('info');

selectedFeatures.on(['add', 'remove'], function () {
  const names = selectedFeatures.getArray().map((feature) => {
    return { 'סוג מבנה': feature.get('building_type'), GFID: feature.get('entity_id'), 'רגיש': feature.get('is_sensitive') };
  });
  console.clear();
  if (names.length > 0) {
    infoBox.innerHTML = JSON.stringify(names, 2, 4);
  } else {
    infoBox.innerHTML = 'None';
  }
});

fetch(WMTS_CAPABILITIES_URL)
	.then(response => response.text())
	.then(text => {
		const results = WMTSParser.read(text);
		const options = ol.source.WMTS.optionsFromCapabilities(results, {
			layer: LAYER_NAME
		});
		options.urls = options.urls.map(url => {
			return url.concat(`?token=${TOKEN}`);
		});
		const rasterLayer = new ol.layer.Tile({ opacity: 1, source: new ol.source.WMTS(options) });
		map.addLayer(rasterLayer);
    map.addLayer(vectorLayer);

});
