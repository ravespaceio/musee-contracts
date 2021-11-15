export interface ERC721MetadataTrait {
	trait_type: string;
	value: string;
}

export interface ERC721Metadata {
	name: string;
	description: string;
	background_color: string;
	external_url: string;
	image: string;
	attributes: ERC721MetadataTrait[];
}

export interface IPFSFile {
	file: string;
	cid: string;
}

export interface IPFSFolder {
	file: string;
	cid: string;
	files: IPFSFile[];
}

export interface FrameImage {
	image: string;
	// path: string;
}

export const enum Category {
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J,
	K,
}

export interface CategoryDetail {
	category: number;
	name: string;
	floor: string;
	price: string;
	supply: number;
	startingTokenId: number;
}
