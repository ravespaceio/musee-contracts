import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { parseEther } from "@ethersproject/units";
import { categories } from "../utils/category";
import { CategoryDetail, ERC721Metadata, IPFSFolder } from "../utils/types";
import { pinDirectoryToIPFS } from "../utils/IPFS";
import { getRandomMetadata, writeJSONFile } from "../utils/metadata";

const pinataKey: string = process.env.PINATA_KEY || "undefined";
const pinataSecret: string = process.env.PINATA_SECRET || "undefined";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
	// @ts-ignore
	const { deployments, getNamedAccounts, ethers } = hre;
	const { deploy } = deployments;
	const { deployer } = await getNamedAccounts();

	// Upload images
	console.log(`Uploading images to IPFS and Arweave...`);
	const imageFolder: IPFSFolder = await pinDirectoryToIPFS(
		pinataKey,
		pinataSecret,
		"./utils/images",
		"/*.jpg"
	);

	// Randomize and write JSON metadata locally
	console.log(`Randomizing metadata ...`);
	for (let i = 0; i < categories.length; i++) {
		const category: CategoryDetail = categories[i];

		console.log(`Processing category ${JSON.stringify(categories[i])}`);

		for (let j = 0; j < categories[i].supply; j++) {
			const tokenId = categories[i].startingTokenId + j;
			const metadata: ERC721Metadata = getRandomMetadata(
				tokenId,
				categories[i],
				imageFolder.files
			);

			console.log(`Writing metadata for tokenId ${tokenId} to file ...`);
			await writeJSONFile(metadata, `${tokenId}`, "./utils/metadata");
		}
	}

	// Upload and pin metadata to IPFS
	const metadataFolder: IPFSFolder = await pinDirectoryToIPFS(
		pinataKey,
		pinataSecret,
		"./utils/metadata",
		"/*"
	);
	const tokenUri = `ipfs://${metadataFolder.cid}/`;

	// Deploy contract
	const FrameDeploy = await deploy("Frame", {
		from: deployer,
		args: [
			"Frame",
			"FRAME",
			tokenUri,
			"https://musee-dezental.com/storefront",
		],
		log: true,
	});

	const Frame = await ethers.getContractAt("Frame", FrameDeploy.address);

	// Configure categories
	console.log(`Configuring categories...`);
	for (let i = 0; i < categories.length; i++) {
		const category: CategoryDetail = categories[i];
		console.log(
			`Setting up category details for category ${JSON.stringify(
				category
			)}`
		);
		await Frame.setCategoryDetail(
			category.category,
			parseEther(category.price),
			category.startingTokenId,
			category.supply
		);
	}

	// Mint all tokens
	console.log(`Minting all tokens to Owner ...`);
	for (let i = 0; i < categories.length; i++) {
		const category: CategoryDetail = categories[i];

		console.log(`Processing category ${JSON.stringify(categories[i])}`);

		for (let j = 0; j < categories[i].supply; j++) {
			const tokenId = categories[i].startingTokenId + j;
			await Frame.ownerMint(deployer, category.category, tokenId);
			console.log(`Minted ${tokenId} to ${deployer}`);
		}
	}
};

export default func;
func.tags = ["NFT", "Token"];
