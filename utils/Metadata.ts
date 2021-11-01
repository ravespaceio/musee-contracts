import * as IPFS from "ipfs-http-client";
import fs from "fs/promises";
import { ls } from "shelljs";
const log = console.log;
import axios from "axios";
import { CategoryDetail } from "./Category";

const SLEEP_TIMER = 5000;

const instance = axios.create({
	baseURL: `https://ipfs2arweave.com/`,
	timeout: 30000,
	headers: {},
});

const ipfs = IPFS.create({
	host: "ipfs.infura.io",
	port: 5001,
	protocol: "https",
});

const frameDecorations = ["Recessed Bevel", "Decorated"];
const frameAspects = ["1:1", "1:1.85"];
const frameColours = ["Tortoiseshell", "Gunmetal", "Fleur", "Benzene", "Ivory"];

async function postToArweave(ipfsHash: string): Promise<any> {
	const response = await instance.post(
		`https://ipfs2arweave.com/permapin/${ipfsHash}`
	);
	log(`Posted to Arweave, result ${JSON.stringify(response.data)}`);
	return response.data;
}

export interface FrameImage {
	image: string;
	path: string;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInteger(max: number): number {
	return Math.floor(Math.random() * max);
}

export async function uploadImages(): Promise<FrameImage[]> {
	const images: FrameImage[] = [];
	const artifactPaths = ls("./utils/frames/*.jpg");
	console.log(`Found artifacts: ${artifactPaths}`);

	// Upload images

	for (let _path of artifactPaths) {
		log(`Reading ${_path}...`);
		const buffer = await fs.readFile(_path);

		log(`Uploading ${_path} to IPFS...`);
		const res = await ipfs.add(Buffer.from(buffer));

		log(`Result is ${res.path}`);
		images.push({
			image: _path,
			path: res.path,
		});

		// Pin with Arweave

		log(`Pushing to Arweave...`);
		await postToArweave(res.path);

		// Sleept to avoid DOS
		await sleep(SLEEP_TIMER);
	}
	return images;
}

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

function getRandomImageFrom(images: FrameImage[]): FrameImage {
	return images[randomInteger(images.length)];
}

export function getRandomMetadata(
	tokenId: number,
	category: CategoryDetail,
	images: FrameImage[]
): ERC721Metadata {
	const metadata: ERC721Metadata = {
		name: `Frame ${tokenId}`,
		description: `Musee Dezental Frame ${tokenId}`,
		background_color: "EEEEEE",
		external_url: `https://musee-dezental.com/frames/${tokenId}`,
		image: getRandomImageFrom(images).path,
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
				trait_type: "Decoration",
				value: frameDecorations[randomInteger(frameDecorations.length)],
			},
			{
				trait_type: "Aspect",
				value: frameAspects[randomInteger(frameAspects.length)],
			},
			{
				trait_type: "Colour",
				value: frameColours[randomInteger(frameColours.length)],
			},
		],
	};
	return metadata;
}

export async function uploadToIPFS(metadata: ERC721Metadata): Promise<string> {
	const res = await ipfs.add(JSON.stringify(metadata));
	log(`IPFS hash ${res.path}`);
	await sleep(SLEEP_TIMER);
	return res.path;
}
