export interface File {
	name: string;
	content: string;
}

export interface DemoMetadata {
	displayName?: string;
	image?: string;
	files: string[];
	template: string;
	packageJson: {
		main: string;
		dependencies: Record<string, string>;
	};
}

export type ClientMetadata = Record<string, DemoMetadata>;

export type DemoIndex = Record<string, ClientMetadata>;
