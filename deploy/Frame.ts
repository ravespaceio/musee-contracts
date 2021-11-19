import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { parseEther } from "@ethersproject/units";
import { BigNumberish, Contract } from "ethers";
import { categories } from "../utils/category";
import { CategoryDetail, ERC721Metadata, IPFSFolder } from "../utils/types";
import { pinDirectoryToIPFS } from "../utils/IPFS";
import { getRandomMetadata, writeJSONFile } from "../utils/metadata";

const pinataKey: string = process.env.PINATA_KEY || "undefined";
const pinataSecret: string = process.env.PINATA_SECRET || "undefined";

// Rinkeby settings
const VRF_COORDINATOR = "0xb3dCcb4Cf7a26f6cf6B120Cf5A73875B7BBc655B";
const LINK = "0x01BE23585060835E02B77ef475b0Cc51aA1e0709";
const KEYHASH =
	"0x2ed0feb3e7fd2022120aa84fab1945545a9f2ffc9076fd6156fa96eaff4c1311";
const FEE: BigNumberish = parseEther("0.1"); // 0.1 LINK fee

async function constructFrame(
	Frame: Contract,
	deployer: string,
	category: CategoryDetail,
	tokenId: number,
	retryCount: number
): Promise<void> {
	try {
		if (retryCount > 0) {
			retryCount--;
			await Frame.constructFrame(deployer, category.category, tokenId);
		} else throw `Failed constructing ${tokenId}`;
	} catch (err) {
		console.log(
			`Error constructing ${tokenId} to ${deployer}, retrying ${retryCount} more times...`
		);
		await constructFrame(Frame, deployer, category, tokenId, retryCount);
	}
}

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
			VRF_COORDINATOR,
			LINK,
			KEYHASH,
			FEE,
		],
		log: true,
	});

	const Frame: Contract = await ethers.getContractAt(
		"Frame",
		FrameDeploy.address
	);

	// Configure categories
	console.log(`Configuring categories...`);
	console.log(``);

	for (let i = 0; i < categories.length; i++) {
		const category: CategoryDetail = categories[i];
		console.log(
			`Setting up details for category ${JSON.stringify(category)}`
		);
		await Frame.setCategoryDetail(
			category.category,
			parseEther(category.price),
			category.startingTokenId,
			category.supply
		);
	}

	// Set initialized to true
	await Frame.setCategoriesInitialized();
	console.log(`Categories are set, contract available to mint`);
};

export default func;
func.tags = ["NFT", "Token"];
