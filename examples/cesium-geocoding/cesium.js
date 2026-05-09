'use strict';
import { TOKEN } from './config/common-config.js';
import { LAYER_NAME, RASTER_SERVICE_URL } from './config/raster-config.js';
import { GEOCODING_URL } from './config/vector-config.js';

//Sandcastle_Begin
/**
 * This class is an example of a custom geocoder. It provides geocoding through the OpenStreetMap Nominatim service.
 * @alias OpenStreetMapNominatimGeocoder
 * @constructor
 */
function OpenStreetMapNominatimGeocoder() {}

/**
 * The function called to geocode using this geocoder service.
 *
 * @param {String} input The query to be sent to the geocoder service
 * @returns {Promise<GeocoderService.Result[]>}
 */
OpenStreetMapNominatimGeocoder.prototype.geocode = function (input) {
  const resource = new Cesium.Resource({
    url: GEOCODING_URL,
    queryParameters: {
      format: "json",
      q: input,
      token: TOKEN
    },
    headers: {
      "accept-language": "he"
    }
  });

  return resource.fetchJson().then(function (results) {
    let bboxDegrees;
    return results.map(function (resultObject) {
      bboxDegrees = resultObject.boundingbox;
      return {
        displayName: resultObject.display_name,
        destination: Cesium.Rectangle.fromDegrees(
          bboxDegrees[2],
          bboxDegrees[0],
          bboxDegrees[3],
          bboxDegrees[1]
        ),
      };
    });
  });
};

const viewer = new Cesium.Viewer("cesiumContainer", {
  vrButton: false,
  homeButton: false,
  infoBox: false,
  timeline: false,
  navigationHelpButton: false,
  shouldAnimate: false,
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
  geocoder: new OpenStreetMapNominatimGeocoder(),
});
