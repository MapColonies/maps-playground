export interface File {
	name: string;
	content: string;
}

export interface Link {
	name: string;
	url: string;
	type: 'css' | 'js';
}

export interface DemoMetadata {
	displayName?: string;
	image?: string;
	files: string[];
	links: Link[];
}

export type ClientMetadata = Record<string, DemoMetadata>;

export type DemoIndex = Record<string, ClientMetadata>;
