'use strict';
import { TOKEN } from './config/common-config.js';
import { PRODUCT_ID, PRODUCT_TYPE, LAYER_IMAGE_FORMAT } from './config/raster-config.js';
import { GEOCODING_URL } from './config/vector-config.js';
import { fetchWmtsTileTemplate } from './utils/wmts-utils.js';

function OpenStreetMapNominatimGeocoder() {}

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

fetchWmtsTileTemplate(PRODUCT_ID, PRODUCT_TYPE, LAYER_IMAGE_FORMAT).then(tileTemplate => {
  new Cesium.Viewer("cesiumContainer", {
    vrButton: false,
    homeButton: false,
    infoBox: false,
    timeline: false,
    navigationHelpButton: false,
    shouldAnimate: false,
    imageryProvider: new Cesium.WebMapTileServiceImageryProvider({
      url: new Cesium.Resource({
        url: tileTemplate,
        queryParameters: {
          token: TOKEN
        }
      }),
      layer: `${PRODUCT_ID}-${PRODUCT_TYPE}`,
      style: "default",
      format: LAYER_IMAGE_FORMAT,
      tileMatrixSetID: "WorldCRS84",
      tilingScheme: new Cesium.GeographicTilingScheme()
    }),
    geocoder: new OpenStreetMapNominatimGeocoder(),
  });
});
