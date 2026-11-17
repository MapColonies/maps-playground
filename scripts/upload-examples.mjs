#!/usr/bin/env zx
// Upload all files under examples/ to S3 using @aws-sdk/client-s3.
// New and changed files (MD5 vs S3 ETag) are uploaded; identical files are skipped.
// Reads AWS_* env vars (same as the app).
//
// Usage:
//   npx zx scripts/upload-examples.mjs [--assets|-a] [examples-dir]
//
//   --assets / -a   also upload the examples/assets/ folder (omit to skip it)

import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { paginateListObjectsV2, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { argv, dotenv, echo, fs, glob, path } from 'zx';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const envFile = path.join(repoRoot, '.env');
if (fs.existsSync(envFile)) dotenv.config(envFile);

const includeAssets = argv.assets || argv.a || false;
const examplesDir = argv._[0] ? path.resolve(argv._[0]) : path.join(repoRoot, 'examples');
const parallelism = Number(process.env.UPLOAD_PARALLELISM ?? 32);

const bucket = process.env.AWS_BUCKET;
if (!bucket) {
	echo('ERROR: AWS_BUCKET is required');
	process.exit(1);
}
if (!(await fs.pathExists(examplesDir))) {
	echo(`ERROR: examples directory not found: ${examplesDir}`);
	process.exit(1);
}

const client = new S3Client({
	endpoint: process.env.AWS_ENDPOINT_URL,
	forcePathStyle: true,
	region: process.env.AWS_REGION ?? 'us-east-1'
});

const CONTENT_TYPES = {
	'.html': 'text/html',
	'.css': 'text/css',
	'.js': 'text/javascript',
	'.json': 'application/json',
	'.txt': 'text/plain',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.gif': 'image/gif'
};

// Fetch all existing S3 keys + ETags.
echo('Fetching existing S3 objects...');
const etagByKey = new Map();
for await (const page of paginateListObjectsV2({ client }, { Bucket: bucket })) {
	for (const { Key, ETag } of page.Contents ?? []) {
		etagByKey.set(Key, ETag.replaceAll('"', ''));
	}
}
echo(`Found ${etagByKey.size} existing objects in S3.\n`);

// Collect local files whose MD5 differs from the S3 ETag.
// ETag equals MD5 for non-multipart uploads, which holds for everything PutObject sends.
const files = await glob('**/*', {
	cwd: examplesDir,
	ignore: includeAssets ? [] : ['assets/**']
});

const toUpload = [];
for (const key of files.sort()) {
	const body = await fs.readFile(path.join(examplesDir, key));
	const md5 = createHash('md5').update(body).digest('hex');
	if (etagByKey.get(key) !== md5) {
		toUpload.push({ key, body, isNew: !etagByKey.has(key) });
	}
}
echo(`${files.length - toUpload.length} files unchanged, ${toUpload.length} to upload.\n`);

// Promise pool: `parallelism` workers pulling from a shared iterator.
const counts = { uploaded: 0, updated: 0, failed: 0 };
const iter = toUpload[Symbol.iterator]();
await Promise.all(
	Array.from({ length: parallelism }, async () => {
		for (const { key, body, isNew } of iter) {
			try {
				await client.send(
					new PutObjectCommand({
						Bucket: bucket,
						Key: key,
						Body: body,
						ContentType: CONTENT_TYPES[path.extname(key)] ?? 'application/octet-stream'
					})
				);
				echo(`${isNew ? 'UP' : 'UPDATE'}    ${key}`);
				counts[isNew ? 'uploaded' : 'updated']++;
			} catch (err) {
				echo(`FAIL    ${key} (${err.message ?? err})`);
				counts.failed++;
			}
		}
	})
);

echo(
	`\nDone — uploaded: ${counts.uploaded} new, ${counts.updated} updated, ${
		files.length - toUpload.length
	} skipped, ${counts.failed} failed`
);
if (counts.failed > 0) process.exit(1);
