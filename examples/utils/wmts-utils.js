import { TOKEN } from './config/common-config.js';
import { RASTER_SCHEME } from './config/raster-config.js';
import { fetchServiceLink } from './utils/catalog-client.js';
import { parseXml } from './utils/xml-utils.js';

const WMTS_NS = 'http://www.opengis.net/wmts/1.0';
const OWS_NS = 'http://www.opengis.net/ows/1.1';

/**
 * Extracts the RESTful tile URL template for a specific layer from a WMTS capabilities document.
 *
 * The returned template contains WMTS placeholders ({TileMatrix}, {TileRow}, {TileCol}, ...)
 * that the caller is expected to substitute when requesting tiles.
 *
 * @param {string} capabilitiesXml - Raw WMTS capabilities XML.
 * @param {string} layerName - `<ows:Identifier>` of the layer to look up.
 * @param {string} [format] - Optional MIME type to require on the ResourceURL (e.g. 'image/png').
 * @returns {string} The tile URL template.
 * @throws If the layer is not present, or no matching tile ResourceURL is found.
 */
export function extractWmtsTileTemplate(capabilitiesXml, layerName, format) {
	const doc = parseXml(capabilitiesXml, 'WMTS capabilities');
	// Locate the <Layer> whose <ows:Identifier> matches the requested layerName.
	const layer = Array.from(doc.getElementsByTagNameNS(WMTS_NS, 'Layer')).find((node) => {
		const identifier = node.getElementsByTagNameNS(OWS_NS, 'Identifier')[0];
		return identifier && identifier.textContent.trim() === layerName;
	});
	if (!layer) {
		throw new Error(`Layer "${layerName}" not found in WMTS capabilities`);
	}
	// Pick the tile ResourceURL, optionally constrained to the requested format.
	const resourceUrl = Array.from(layer.getElementsByTagNameNS(WMTS_NS, 'ResourceURL')).find(
		(node) =>
			node.getAttribute('resourceType') === 'tile' &&
			(!format || node.getAttribute('format') === format)
	);
	if (!resourceUrl) {
		throw new Error(`No tile ResourceURL for layer "${layerName}"`);
	}
	return resourceUrl.getAttribute('template');
}

/**
 * Resolves the raster catalog entry for a product, fetches its WMTS capabilities,
 * and returns the tile URL template along with the layer name from the catalog.
 *
 * Convenience helper that wraps the full catalog → capabilities → template chain.
 *
 * @param {string} productId - Raster product identifier.
 * @param {string} productType - Raster product type.
 * @param {string} [format] - Optional MIME type filter passed to `extractWmtsTileTemplate`.
 * @returns {Promise<{ template: string, name: string }>} Tile URL template (still contains WMTS placeholders) and the layer name reported by the catalog.
 * @throws If the catalog lookup, capabilities fetch, or layer extraction fails.
 */
export async function fetchWmtsTileTemplate(productId, productType, format) {
	const { url: capabilitiesUrl, name } = await fetchServiceLink(
		'raster',
		productId,
		productType,
		RASTER_SCHEME
	);
	// Capabilities endpoint is token-gated; same token is later used per-tile by the caller.
	const res = await fetch(`${capabilitiesUrl}?token=${TOKEN}`);
	if (!res.ok) {
		throw new Error(`Fetching WMTS capabilities failed: ${res.status}`);
	}
	const template = extractWmtsTileTemplate(await res.text(), name, format);
	return { template, name };
}
