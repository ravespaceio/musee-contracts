import { CategoryDetail, ERC721Metadata, IPFSFile } from "./types";
import { randomInteger } from "./utils";
import * as fs from "fs/promises";
import * as path from "path";
const log = console.log;

function getRandomFileFrom(images: IPFSFile[]): IPFSFile {
	return images[randomInteger(images.length)];
}

export function getRandomMetadata(
	tokenId: number,
	category: CategoryDetail,
	images: IPFSFile[]
): ERC721Metadata {
	const metadata: ERC721Metadata = {
		name: `Frame ${tokenId}`,
		description: `Musee Dezental Frame ${tokenId}`,
		background_color: "EEEEEE",
		external_url: `https://musee-dezental.com/frames/${tokenId}`,
		image: getRandomFileFrom(images).cid,
		attributes: [
			{
				trait_type: "Category",
				value: category.name,
			},
			{
				trait_type: "Floor",
				value: category.floor,
			},
			{
				trait_type: "TokenID",
				value: tokenId.toString(),
			},
		],
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
