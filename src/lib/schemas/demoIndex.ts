import type { JTDSchemaType } from 'ajv/dist/jtd';
import type { DemoIndex, DemoMetadata } from '$lib/types';

const demoMetadataSchema: JTDSchemaType<DemoMetadata> = {
	optionalProperties: {
		displayName: {
			type: 'string'
		},
		image: {
			type: 'string'
		}
	},
	properties: {
		files: {
			elements: {
				type: 'string'
			}
		},
		links: {
			elements: {
				properties: {
					name: { type: 'string' },
					type: { enum: ['css', 'js'] },
					url: { type: 'string' }
				}
			}
		}
	}
};

export const demoSchema: JTDSchemaType<DemoIndex> = {
	values: {
		values: demoMetadataSchema
	}
};
