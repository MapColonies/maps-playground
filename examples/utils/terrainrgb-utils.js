import { TOKEN } from './config/common-config.js';
import { TERRAINRGB_URL } from './config/dem-config.js';

export var TILE_SIZE = 256;

export function tileUrl(z, x, y) {
	return `${TERRAINRGB_URL.replace('{z}', z).replace('{x}', x).replace('{y}', y)}?token=${TOKEN}`;
}

// Mapbox TerrainRGB: height in metres = -10000 + (R * 256 * 256 + G * 256 + B) * 0.1
export function decodeHeight(r, g, b) {
	return -10000 + (r * 65536 + g * 256 + b) * 0.1;
}

/**
 * @returns {Promise<Float32Array | null>} NaN where a pixel is transparent (no data); null when the
 * server has no tile there.
 */
export async function fetchHeights(z, x, y) {
	const res = await fetch(tileUrl(z, x, y));
	if (!res.ok) return null;
	// Without these options the browser may colour-correct the pixels, which changes the decoded heights.
	const bitmap = await createImageBitmap(await res.blob(), {
		colorSpaceConversion: 'none',
		premultiplyAlpha: 'none'
	});
	const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	ctx.drawImage(bitmap, 0, 0);
	const px = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
	const heights = new Float32Array(bitmap.width * bitmap.height);
	for (let i = 0; i < heights.length; i++) {
		heights[i] = px[4 * i + 3] === 0 ? NaN : decodeHeight(px[4 * i], px[4 * i + 1], px[4 * i + 2]);
	}
	return heights;
}

var RAMP = [
	[-400, [8, 48, 107]],
	[-200, [33, 113, 181]],
	[0, [65, 171, 93]],
	[200, [173, 221, 142]],
	[400, [254, 224, 139]],
	[700, [215, 120, 60]],
	[1000, [120, 60, 30]]
];

export function rampColour(height) {
	if (height <= RAMP[0][0]) return RAMP[0][1];
	for (let i = 1; i < RAMP.length; i++) {
		const [h1, c1] = RAMP[i];
		if (height <= h1) {
			const [h0, c0] = RAMP[i - 1];
			const t = (height - h0) / (h1 - h0);
			return c0.map((v, k) => Math.round(v + t * (c1[k] - v)));
		}
	}
	return RAMP[RAMP.length - 1][1];
}

export var RAMP_STOPS = RAMP.flat();
