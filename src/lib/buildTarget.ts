// Read at build time in Node; the guard keeps the browser bundle from touching `process`.
export const isGhPagesBuild =
	typeof process !== 'undefined' && process.env.BUILD_TARGET === 'gh-pages';
