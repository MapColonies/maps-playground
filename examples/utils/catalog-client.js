import { MAPCOLONIES_CATALOG_URL, TOKEN } from './config/common-config.js';
import { parseXml } from './utils/xml-utils.js';

const TYPENAMES = {
	raster: 'mc:MCRasterRecord',
	'3d': 'mc:MC3DRecord',
	dem: 'mc:MCDEMRecord'
};

const namespaceFor = (catalogKey) => `http://schema.mapcolonies.com/${catalogKey}`;

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

function parseLinks(xmlText, namespace) {
	const doc = parseXml(xmlText, 'CSW response');
	return Array.from(doc.getElementsByTagNameNS(namespace, 'links')).reduce((acc, node) => {
		const scheme = node.getAttribute('scheme');
		if (scheme) acc[scheme] = (node.textContent || '').trim();
		return acc;
	}, {});
}

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
