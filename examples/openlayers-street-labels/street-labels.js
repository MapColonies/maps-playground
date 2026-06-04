import { TOKEN } from './config/common-config.js';
import { PRODUCT_ID, PRODUCT_TYPE } from './config/raster-config.js';
import { fetchServiceLink } from './utils/catalog-client.js';

const WMTSParser = new ol.format.WMTSCapabilities();
let rasterLayer;


const style = new ol.style.Style({
  text: new ol.style.Text({
    font: '20px "sans-serif"',
    placement: 'line',
    rotationWithView: true,
    stroke: new ol.style.Stroke({
      color: 'white'
    }),
    fill: new ol.style.Fill({
      color: 'red',
    }),
  }),
  stroke: new ol.style.Stroke({
    color: 'red'
  })
});

const vectorSource = new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    strategy: ol.loadingstrategy.tile(ol.tilegrid.createXYZ({tileSize: 256})),
    url: function(extent) {
      return VECTOR_WFS_URL + `?service=WFS&version=2.0.0&request=GetFeature&typeName=core:roads_line&srsname=EPSG:4326&bbox=${extent.join(',')},EPSG:4326&token=${TOKEN}&outputFormat=application/json&count=10000`;
    }
  });

const vectorLayer = new ol.layer.Vector({
    declutter: true,
    source: vectorSource,
    style: function (feature) {
      style.getText().setText(feature.get('name') === null ? 'לא ידוע' : feature.get('name'));
      return style;
    },
    minZoom: 15,
    maxZoom: 20
  });

const map = new ol.Map({
  target: 'map',
  view: new ol.View({
    center: [34.465798, 31.513991],
    zoom: 18,
    projection: 'EPSG:4326',
    minZoom: 12,
  }),
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
