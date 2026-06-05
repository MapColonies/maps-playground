import { TOKEN } from './config/common-config.js';
import { RASTER_SCHEME } from './config/raster-config.js';
import { fetchServiceLink } from './utils/catalog-client.js';
import { parseXml } from './utils/xml-utils.js';

const WMTS_NS = 'http://www.opengis.net/wmts/1.0';
const OWS_NS = 'http://www.opengis.net/ows/1.1';

export function extractWmtsTileTemplate(capabilitiesXml, layerName, format) {
	const doc = parseXml(capabilitiesXml, 'WMTS capabilities');
	const layer = Array.from(doc.getElementsByTagNameNS(WMTS_NS, 'Layer')).find((node) => {
		const identifier = node.getElementsByTagNameNS(OWS_NS, 'Identifier')[0];
		return identifier && identifier.textContent.trim() === layerName;
	});
	if (!layer) {
		throw new Error(`Layer "${layerName}" not found in WMTS capabilities`);
	}
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

export async function fetchWmtsTileTemplate(productId, productType, format) {
	const capabilitiesUrl = await fetchServiceLink('raster', productId, productType, RASTER_SCHEME);
	const res = await fetch(`${capabilitiesUrl}?token=${TOKEN}`);
	if (!res.ok) {
		throw new Error(`Fetching WMTS capabilities failed: ${res.status}`);
	}
	return extractWmtsTileTemplate(await res.text(), `${productId}-${productType}`, format);
}
