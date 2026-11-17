export function parseXml(xmlText, context) {
	const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
	const parseError = doc.getElementsByTagName('parsererror')[0];
	if (parseError) {
		throw new Error(`${context} parse error: ${parseError.textContent}`);
	}
	return doc;
}
