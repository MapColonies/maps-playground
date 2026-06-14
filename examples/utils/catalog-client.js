import { MAPCOLONIES_CATALOG_URL, TOKEN } from './config/common-config.js';
import { parseXml } from './utils/xml-utils.js';

const TYPENAMES = {
	raster: 'mc:MCRasterRecord',
	'3d': 'mc:MC3DRecord',
	dem: 'mc:MCDEMRecord'
};

const namespaceFor = (catalogKey) => `http://schema.mapcolonies.com/${catalogKey}`;

/**
 * Builds a CSW 2.0.2 GetRecords XML body that filters by productId and productType.
 *
 * @param {string} typename - CSW typeName for the catalog (e.g. 'mc:MCRasterRecord').
 * @param {string} namespace - XML namespace URI for the catalog schema.
 * @param {string} productId - Product identifier to match (e.g. 'blueMarble').
 * @param {string} productType - Product type to match (e.g. 'Orthophoto').
 * @returns {string} CSW GetRecords request XML.
 */
function buildGetRecordsBody(typename, namespace, productId, productType) {
	return `<?xml version="1.0" encoding="UTF-8"?>
<csw:GetRecords xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" service="CSW" maxRecords="1" startPosition="1" outputSchema="${namespace}" version="2.0.2" xmlns:mc="${namespace}">
  <csw:Query typeNames="${typename}">
    <csw:ElementSetName>full</csw:ElementSetName>
    <csw:Constraint version="1.1.0">
      <Filter xmlns="http://www.opengis.net/ogc">
        <And>
          <PropertyIsEqualTo>
            <PropertyName>mc:productId</PropertyName>
            <Literal>${productId}</Literal>
          </PropertyIsEqualTo>
          <PropertyIsEqualTo>
            <PropertyName>mc:productType</PropertyName>
            <Literal>${productType}</Literal>
          </PropertyIsEqualTo>
        </And>
      </Filter>
    </csw:Constraint>
  </csw:Query>
</csw:GetRecords>`;
}

/**
 * Parses a CSW response and returns the service URL and layer name for the requested scheme.
 *
 * @param {string} xmlText - Raw CSW response XML.
 * @param {string} namespace - Namespace URI used for `<links>` elements in the response.
 * @param {string} scheme - Scheme name to pick (e.g. 'WMTS', 'WCS', '3DTiles').
 * @returns {{ url: string, name: string } | null} Service URL and layer name from the `name` attribute, or null if no matching `<links>` element is present.
 */
function parseLink(xmlText, namespace, scheme) {
	const doc = parseXml(xmlText, 'CSW response');
	const node = Array.from(doc.getElementsByTagNameNS(namespace, 'links')).find(
		(n) => n.getAttribute('scheme') === scheme
	);
	if (!node) return null;
	return {
		url: (node.textContent || '').trim(),
		name: node.getAttribute('name') || ''
	};
}

/**
 * Resolves the service URL and layer name for a specific scheme on a catalog record.
 *
 * @param {'raster'|'3d'|'dem'} catalogKey - Catalog the product lives in.
 * @param {string} productId - Product identifier.
 * @param {string} productType - Product type.
 * @param {string} scheme - Scheme name to pick from the record (e.g. 'WMTS', 'WCS', '3DTiles').
 * @returns {Promise<{ url: string, name: string }>} Service URL and layer name from the matched `<links>` element.
 * @throws If the catalog key is unknown, the CSW request fails, or the scheme is not advertised.
 */
export async function fetchServiceLink(catalogKey, productId, productType, scheme) {
	const typename = TYPENAMES[catalogKey];
	if (!typename) throw new Error(`Unknown catalog: ${catalogKey}`);
	const namespace = namespaceFor(catalogKey);
	const res = await fetch(`${MAPCOLONIES_CATALOG_URL}/api/${catalogKey}/v1/csw`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/xml', 'x-api-key': TOKEN },
		body: buildGetRecordsBody(typename, namespace, productId, productType)
	});
	if (!res.ok) {
		throw new Error(`CSW ${catalogKey} ${productId} failed: ${res.status}`);
	}
	const link = parseLink(await res.text(), namespace, scheme);
	if (!link) {
		throw new Error(`No "${scheme}" link in ${catalogKey}/${productId}`);
	}
	return link;
}
