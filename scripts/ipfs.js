#!/usr/bin/env node

const IPFS = require("ipfs-http-client");
const shell = require("shelljs");
const path = require("path");
const fs = require("fs");
const log = console.log;
const axios = require("axios");

const instance = axios.create({
	baseURL: `https://ipfs2arweave.com/`,
	timeout: 30000,
	headers: {},
});

const postToArweave = async (ipfsHash) => {
	const response = await instance.post(
		`https://ipfs2arweave.com/permapin/${ipfsHash}`
	);
	log(`Posted to Arweave, result ${JSON.stringify(response.data)}`);
	return response.data;
};

const sleep = (ms) => {
	return new Promise((resolve) => setTimeout(resolve, ms));
};

const randomInteger = (max) => {
	return Math.floor(Math.random() * max);
};

const frameDecorations = ["Recessed Bevel", "Decorated"];
const frameAspects = ["1:1", "1:1.85"];
const frameColours = ["Tortoiseshell", "Gunmetal", "Fleur", "Benzene", "Ivory"];
const categories = [
	{
		name: "A",
		floor: "EG",
		count: 1,
	},
	{
		name: "B",
		floor: "EG",
		count: 2,
	},
	{
		name: "C",
		floor: "EG",
		count: 8,
	},
	{
		name: "D",
		floor: "EG",
		count: 12,
	},
	{
		name: "E Gallery",
		floor: "1OG",
		count: 16,
	},
	{
		name: "F",
		floor: "1OG",
		count: 18,
	},
	{
		name: "G Lower Terraza",
		floor: "1OG",
		count: 24,
	},
	{
		name: "H",
		floor: "1OG",
		count: 32,
	},
	{
		name: "I Upper Terraza",
		floor: "2OG",
		count: 32,
	},
	{
		name: "J",
		floor: "2OG",
		count: 36,
	},
	{
		name: "K",
		floor: "2OG",
		count: 41,
	},
];

async function main() {
	const ipfs = IPFS.create({
		host: "ipfs.infura.io",
		port: "5001",
		protocol: "https",
	});

	const artifactPaths = shell.ls("./scripts/frames/*.jpg");

	let images = [];
	let frames = [];

	// Upload images

	for (let _path of artifactPaths) {
		log(`Reading ${_path}...`);
		const buffer = fs.readFileSync(_path);

		log(`Uploading ${_path} to IPFS...`);
		const res = await ipfs.add(Buffer.from(buffer));

		log(`Result is ${res.path}`);
		images.push({
			image: path,
			path: res.path,
		});

		log(`Pushing to Arweave...`);
		await postToArweave(res.path);

		await sleep(2500);
	}

	// Process categories

	let tokenId = 0;

	for (let j = 0; j < categories.length; j++) {
		const category = categories[j];
		log(
			`Randomizing test metadata for category ${JSON.stringify(
				category
			)}...`
		);

		for (let i = 0; i < category.count; i++) {
			const metadata = {
				name: `Frame ${tokenId}`,
				description: `Musee Dezental Frame ${tokenId}`,
				background_color: "EEEEEE",
				external_url: `https://musee-dezental/frames/${tokenId}`,
				image: images[randomInteger(images.length) - 1].path,
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
						value: frameDecorations[
							randomInteger(frameDecorations.length) - 1
						],
					},
					{
						trait_type: "Aspect",
						value: frameAspects[
							randomInteger(frameAspects.length) - 1
						],
					},
					{
						trait_type: "Colour",
						value: frameColours[
							randomInteger(frameColours.length) - 1
						],
					},
				],
			};

			log(
				`Created metadata ${JSON.stringify(
					metadata
				)}, uploading to IPFS...`
			);
			const res = await ipfs.add(JSON.stringify(metadata));
			log(`IPFS hash ${res.path}`);

			frames.push({ frame: metadata, hash: res.path });

			log(`Waiting before sending next file...`);
			await sleep(2500);
			tokenId++;
		}
	}

	log();
	log(`Finished`);
	log(`Metadata paths are: `);
	frames.forEach((frame) => log(frame.hash));
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.log(err);
		process.exit(1);
	});
