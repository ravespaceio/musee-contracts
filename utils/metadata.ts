import {
	CategoryDetail,
	ERC721Metadata,
	ERC721MetadataTrait,
	IPFSFile,
	IPFSFolder,
} from "./types";
import * as fs from "fs/promises";
import * as path from "path";
const log = console.log;

function isChameleon(tokenId: number): boolean {
	const chameleons = [
		0, 1, 2, 5, 6, 15, 26, 32, 43, 50, 60, 71, 93, 99, 105, 113, 120, 134,
		140, 151, 154, 170, 178, 182, 191, 199, 210, 220,
	];
	const isChameleon = chameleons.indexOf(tokenId) != -1;

	if (isChameleon)
		console.log(
			`tokenId ${tokenId} is a Chameleon, writing extra attribute to metadata`
		);

	return isChameleon;
}

const chameleonAttribute: ERC721MetadataTrait = {
	trait_type: "Chameleon",
	value: "Yes",
};

export function getExactMetadata(
	tokenId: number,
	category: CategoryDetail,
	image: IPFSFolder | IPFSFile
): ERC721Metadata {
	const attributes: ERC721MetadataTrait[] = [
		{
			trait_type: "Category",
			value: category.name,
		},
		{
			trait_type: "Floor",
			value: category.floor,
		},
		{
			trait_type: "Type",
			value: category.type,
		},
		{
			trait_type: "TokenID",
			value: tokenId.toString(),
		},
	];

	if (isChameleon(tokenId)) attributes.push(chameleonAttribute);

	const metadata: ERC721Metadata = {
		name: `Frame #${tokenId}`,
		description: `Musee Dezental Frame #${tokenId}`,
		background_color: "EEEEEE",
		external_url: `https://musee-dezental.com/frames/${tokenId}`,
		image: image.cid,
		attributes: attributes,
	};
	return metadata;
}

export async function writeJSONFile(
	metadata: ERC721Metadata,
	targetFileName: string,
	targetFolder: string
): Promise<void> {
	try {
		const target = path.join(targetFolder, targetFileName);
		await fs.writeFile(target, JSON.stringify(metadata));
	} catch (err) {
		console.log(`metadata::writeJSONFile() ${err}`);
		throw err;
	}
}
