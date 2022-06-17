import * as IPFS from "ipfs-http-client";
import fs from "fs";
import { ls } from "shelljs";
import axios, { AxiosResponse } from "axios";
import { ERC721Metadata, IPFSFile, IPFSFolder } from "./types";
import FormData from "form-data";
import { convertFilePathToBaseDirectoryPath, sleep } from "./utils";
const ipfsOnlyHash = require("ipfs-only-hash");
const log = console.log;

const SLEEP_TIMER = 5000;

const pinataApiKey: string = process.env.PINATA_KEY || "undefined";
const pinataSecretApiKey: string = process.env.PINATA_SECRET || "undefined";

const ipfs = IPFS.create({
	host: "ipfs.infura.io",
	port: 5001,
	protocol: "https",
});

export async function pinDirectoryToIPFS(
	sourceFolder: string,
	sourceFolderFilter: string
): Promise<IPFSFolder> {
	const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
	const src = sourceFolder || "./frames";
	let data = new FormData();
	const files: IPFSFile[] = [];
	let folder: IPFSFolder = {
		file: sourceFolder,
		cid: "",
		files: [],
	};

	// We gather the files from a local directory in this example, but a valid readStream is all that's needed for each file in the directory.
	const artifactPaths = ls(sourceFolder + sourceFolderFilter);

	for (let file of artifactPaths) {
		const baseDirectory = convertFilePathToBaseDirectoryPath(src, file);
		let fileStream: fs.ReadStream = fs.createReadStream(file);
		const fileHash = await ipfsOnlyHash.of(fileStream);
		// log(
		// 	`Processing file ${file} with base directory ${baseDirectory} and hash ${fileHash}`
		// );
		files.push({ file: file, cid: fileHash });
		fileStream = fs.createReadStream(file);

		// For each file stream, we need to include the correct relative file path
		data.append(`file`, fileStream, {
			filepath: baseDirectory,
		});
	}

	const metadata = JSON.stringify({
		name: "frames",
		// keyvalues: {
		// 	exampleKey: 'exampleValue'
		// }
	});
	data.append("pinataMetadata", metadata);

	const axiosConfig = {
		maxBodyLength: Infinity, //this is needed to prevent axios from erroring out with large directories
		headers: {
			"Content-Type": `multipart/form-data; boundary=${data.getBoundary()}`,
			pinata_api_key: pinataApiKey,
			pinata_secret_api_key: pinataSecretApiKey,
		},
	};

	let response: AxiosResponse<any, any>;
	try {
		response = await axios.post(url, data, axiosConfig);
		log(response.data);
		folder.cid = response.data.IpfsHash;
		folder.files = files;
	} catch (err) {
		log(err);
		throw err;
	}
	return folder;
}

export async function uploadToIPFS(metadata: ERC721Metadata): Promise<string> {
	const res = await ipfs.add(JSON.stringify(metadata));
	log(`IPFS hash ${res.path}`);
	await sleep(SLEEP_TIMER);
	return res.path;
}

export async function postToArweave(ipfsHash: string): Promise<any> {
	try {
		const instance = axios.create({
			baseURL: `https://ipfs2arweave.com/`,
			timeout: 30000,
			headers: {},
		});

		const response = await instance.post(
			`https://ipfs2arweave.com/permapin/${ipfsHash}`
		);
		log(`Posted to Arweave, result ${JSON.stringify(response.data)}`);
		return response.data;
	} catch (err) {
		log(err);
		throw err;
	}
}
