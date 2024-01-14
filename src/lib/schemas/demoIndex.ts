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
		template: {
			type: 'string'
		},
		packageJson: {
			properties: {
				main: {
					type: 'string'
				},
				dependencies: {
					values: {
						type: 'string'
					}
				}
			},
			additionalProperties: true
		},
		files: {
			elements: {
				type: 'string'
			}
		}
	}
};

export const demoSchema: JTDSchemaType<DemoIndex> = {
	values: {
		values: demoMetadataSchema
	}
};
