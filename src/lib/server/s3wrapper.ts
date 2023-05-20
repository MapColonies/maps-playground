import { env } from '$env/dynamic/private';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

const {
	AWS_ACCESS_KEY_ID: accessKeyId,
	AWS_SECRET_ACCESS_KEY: secretAccessKey,
	AWS_ENDPOINT_URL: awsEndpointUrl,
	AWS_REGION: awsRegion,
	AWS_BUCKET: bucket,
	INDEX_KEY: indexKey
} = env;

for (const item of [accessKeyId, secretAccessKey, awsEndpointUrl, bucket, indexKey]) {
	if (item === undefined) {
		throw new Error(`env: ${item} is undefined`);
	}
}

const client = new S3Client({
	endpoint: awsEndpointUrl,
	credentials: {
		accessKeyId,
		secretAccessKey
	},
	forcePathStyle: true,
	region: awsRegion ?? 'us-east-1',
});

export async function getStringObject(key: string): Promise<string> {
	const command = new GetObjectCommand({
		Bucket: bucket,
		Key: key,

	});

	const res = await client.send(command);

	const resString = await res.Body?.transformToString();

	if (resString === undefined) {
		throw new Error();
	}

	return resString;
}
