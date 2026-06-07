import { env } from '$env/dynamic/private';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

let cachedClient: S3Client | undefined;
let cachedBucket: string | undefined;

function getClient(): { client: S3Client; bucket: string } {
	if (cachedClient && cachedBucket) {
		return { client: cachedClient, bucket: cachedBucket };
	}

	const {
		AWS_ACCESS_KEY_ID: accessKeyId,
		AWS_SECRET_ACCESS_KEY: secretAccessKey,
		AWS_ENDPOINT_URL: awsEndpointUrl,
		AWS_REGION: awsRegion,
		AWS_BUCKET: bucket,
		INDEX_KEY: indexKey
	} = env;

	const required = { accessKeyId, secretAccessKey, awsEndpointUrl, bucket, indexKey };
	for (const [name, value] of Object.entries(required)) {
		if (value === undefined) {
			throw new Error(`env: ${name} is undefined`);
		}
	}

	cachedClient = new S3Client({
		endpoint: awsEndpointUrl,
		credentials: {
			accessKeyId: accessKeyId as string,
			secretAccessKey: secretAccessKey as string
		},
		forcePathStyle: true,
		region: awsRegion ?? 'us-east-1'
	});
	cachedBucket = bucket;

	return { client: cachedClient, bucket: cachedBucket as string };
}

export async function getStringObject(key: string): Promise<string> {
	const { client, bucket } = getClient();
	const command = new GetObjectCommand({
		Bucket: bucket,
		Key: key
	});

	const res = await client.send(command);

	const resString = await res.Body?.transformToString();

	if (resString === undefined) {
		throw new Error();
	}

	return resString;
}
