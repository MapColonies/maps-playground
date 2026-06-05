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
 * Parses a CSW response and collects every `<links>` element into a scheme → URL map.
 *
 * @param {string} xmlText - Raw CSW response XML.
 * @param {string} namespace - Namespace URI used for `<links>` elements in the response.
 * @returns {Record<string, string>} Map of scheme name (e.g. 'WMTS', 'WCS', '3DTiles') to service URL.
 */
function parseLinks(xmlText, namespace) {
	const doc = parseXml(xmlText, 'CSW response');
	// Each <links> node carries a `scheme` attribute and the service URL as text content.
	return Array.from(doc.getElementsByTagNameNS(namespace, 'links')).reduce((acc, node) => {
		const scheme = node.getAttribute('scheme');
		if (scheme) acc[scheme] = (node.textContent || '').trim();
		return acc;
	}, {});
}

/**
 * Queries a MapColonies CSW catalog for a single record and returns it's link map.
 *
 * @param {'raster'|'3d'|'dem'} catalogKey - Which catalog to query.
 * @param {string} productId - Product identifier to look up.
 * @param {string} productType - Product type to look up.
 * @returns {Promise<Record<string, string>>} Map of scheme → service URL exposed by the record.
 * @throws If the catalog key is unknown or the CSW request fails.
 */
export async function fetchRecordLinks(catalogKey, productId, productType) {
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
	return parseLinks(await res.text(), namespace);
}

/**
 * Resolves the service URL for a specific scheme on a catalog record.
 * Thin convenience wrapper around `fetchRecordLinks` for the common single-scheme lookup.
 *
 * @param {'raster'|'3d'|'dem'} catalogKey - Catalog the product lives in.
 * @param {string} productId - Product identifier.
 * @param {string} productType - Product type.
 * @param {string} scheme - Scheme name to pick from the record (e.g. 'WMTS', 'WCS', '3DTiles').
 * @returns {Promise<string>} Service URL for the requested scheme.
 * @throws If the requested scheme is not advertised by the record; the error lists the schemes that are.
 */
export async function fetchServiceLink(catalogKey, productId, productType, scheme) {
	const links = await fetchRecordLinks(catalogKey, productId, productType);
	const url = links[scheme];
	if (!url) {
		throw new Error(
			`No "${scheme}" link in ${catalogKey}/${productId}. Available: ${Object.keys(links).join(
				', '
			)}`
		);
	}
	return url;
}
