import { TOKEN } from './config/common-config.js';
import { PRODUCT_ID, PRODUCT_TYPE } from './config/raster-config.js';
import { VECTOR_WFS_URL } from './config/vector-config.js';
import { fetchServiceLink } from './utils/catalog-client.js';

const WMTSParser = new ol.format.WMTSCapabilities();
let rasterLayer;

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
        const color = feature.get('is_sensitive') === true ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.7)';
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
    width: 10,
  }),
});

// a normal select interaction to handle click
const select = new ol.interaction.Select({
  style: function (feature) {
    const color = feature.get('is_sensitive') === true ? 'rgba(255, 0, 0, 1)' : 'rgba(255, 255, 255, 1)';
    selectedStyle.getFill().setColor(color);
    return selectedStyle;
  },
});
map.addInteraction(select);

const selectedFeatures = select.getFeatures();

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

fetchServiceLink('raster', PRODUCT_ID, PRODUCT_TYPE, 'WMTS')
	.then(url => fetch(`${url}?token=${TOKEN}`))
	.then(response => response.text())
	.then(text => {
		const results = WMTSParser.read(text);
		const options = ol.source.WMTS.optionsFromCapabilities(results, {
			layer: `${PRODUCT_ID}-${PRODUCT_TYPE}`
		});
		options.urls = options.urls.map(url => {
			return url.concat(`?token=${TOKEN}`);
		});
		rasterLayer = new ol.layer.Tile({ opacity: 1, source: new ol.source.WMTS(options) });
		map.addLayer(rasterLayer);
    map.addLayer(vectorLayer);

});
