# MapColonies Playground
Code playground for mapping clients.
The code examples are saved in S3 bucket and fetched and cached by the server.

## Environment

- AWS_ACCESS_KEY_ID - S3 access key
- AWS_SECRET_ACCESS_KEY - S3 secret key
- AWS_REGION - the S3 region
- AWS_ENDPOINT_URL - S3 custom endpoint
- AWS_BUCKET - The S3 bucket name.
- INDEX_KEY - The index file S3 key.
- ITEMS_TIMEOUT -The time in seconds before declaring item in the cache as stale.
- ITEMS_STALE - The time in seconds to keep stale items in the cache.
- PUBLIC_CATALOG_HREF - Path for the catalog application.
- PUBLIC_DEVPORTAL_HREF - Path for the developer portal.

## Configurations

The codes examples shown are defined by a json index file with all the data needed. All the files listed in the index are loaded from the same bucket as the index itself.

### example index
```json
{
  "ol": {
    "basic-ol": {
      "displayName": "basic openlayers",
      "files": ["openlayers_basic.js", "openlayers.css", "openlayers.html"],
      "links": [
        { "name": "ol.css", "url": "/libs/ol/v7.3.0/ol.css", "type": "css" },
        { "name": "ol.js", "url": "/libs/ol/v7.3.0/ol.js", "type": "js" }
      ]
    },
    "geojson-style-ol": {
      "displayName": "geojson openlayers",
      "files": ["openlayers_geojson.js", "openlayers.css", "openlayers.html"],
      "links": [
        { "name": "ol.css", "url": "/libs/ol/v7.3.0/ol.css", "type": "css" },
        { "name": "ol.js", "url": "/libs/ol/v7.3.0/ol.js", "type": "js" }
      ]
    }
  },
  "cesium": {
    "basic-cesium": {
      "displayName": "basic cesium",
      "files": ["cesium_basic.js", "cesium.html"],
      "links": [
        {
          "name": "cesium.js",
          "url": "/libs/Cesium/Cesium.js",
          "type": "js"
        },
        {
          "name": "widgets.css",
          "url": "/libs/Cesium/Widgets/widgets.css",
          "type": "css"
        }
      ]
    }
  },
  "leaflet": {
    "basic-leaflet": {
      "displayName": "basic leaflet",
      "files": ["leaflet_basic.js", "leaflet.css", "leaflet.html"],
      "links": [
        {
          "name": "leaflet.js",
          "url": "/libs/leaflet/1.9.4/leaflet.js",
          "type": "js"
        },
        {
          "name": "leaflet.css",
          "url": "/libs/leaflet/1.9.4/leaflet.css",
          "type": "css"
        }
      ]
    }
  }
}
```

## Developing

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.
