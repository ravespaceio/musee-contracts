import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { parseEther } from "@ethersproject/units";
import { Contract } from "ethers";
import { categories } from "../utils/category";
import { CategoryDetail, ERC721Metadata, IPFSFolder } from "../utils/types";
import { pinDirectoryToIPFS } from "../utils/IPFS";
import { getRandomMetadata, writeJSONFile } from "../utils/metadata";

const pinataKey: string = process.env.PINATA_KEY || "undefined";
const pinataSecret: string = process.env.PINATA_SECRET || "undefined";

// async function constructFrame(
// 	Frame: Contract,
// 	deployer: string,
// 	category: CategoryDetail,
// 	tokenId: number,
// 	retryCount: number
// ): Promise<void> {
// 	try {
// 		if (retryCount > 0) {
// 			retryCount--;
// 			await Frame.constructFrame(deployer, category.category, tokenId);
// 		} else throw `Failed constructing ${tokenId}`;
// 	} catch (err) {
// 		console.log(
// 			`Error constructing ${tokenId} to ${deployer}, retrying ${retryCount} more times...`
// 		);
// 		await constructFrame(Frame, deployer, category, tokenId, retryCount);
// 	}
// }

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
	// @ts-ignore
	const { deployments, getNamedAccounts, ethers, getChainId } = hre;
	const { deploy } = deployments;
	const { deployer } = await getNamedAccounts();
	const chainID = await getChainId();

	let vrfCoordinatorAddress: string,
		vrfCoordinatorKeyHash: string,
		vrfCoordinatorFee: string,
		linkAddress: string;

	switch (chainID) {
		// Mainnet
		case "1": {
			linkAddress = "0x514910771AF9Ca656af840dff83E8264EcF986CA";
			vrfCoordinatorAddress =
				"0xf0d54349aDdcf704F77AE15b96510dEA15cb7952";
			vrfCoordinatorKeyHash =
				"0xAA77729D3466CA35AE8D28B3BBAC7CC36A5031EFDC430821C02BC31A238AF445";
			vrfCoordinatorFee = "2.0";
			break;
		}
		// Rinkeby
		case "4": {
			linkAddress = "0x01BE23585060835E02B77ef475b0Cc51aA1e0709";
			vrfCoordinatorAddress =
				"0xb3dCcb4Cf7a26f6cf6B120Cf5A73875B7BBc655B";
			vrfCoordinatorKeyHash =
				"0x2ed0feb3e7fd2022120aa84fab1945545a9f2ffc9076fd6156fa96eaff4c1311";
			vrfCoordinatorFee = "0.1";
			break;
		}
		default: {
			// If no real network specified, create our own LINK Token,
			// VRFCoordinator, and some mock Exhibit contracts

			const result1 = await deploy("LinkMock", {
				from: deployer,
				args: ["LINK", "LINK"],
				log: true,
			});
			linkAddress = result1.address;

			const result2 = await deploy("VRFCoordinatorMock", {
				from: deployer,
				args: [],
				log: true,
			});
			vrfCoordinatorAddress = result2.address;
			vrfCoordinatorKeyHash =
				"0x0000000000000000000000000000000000000000000000000000000000000001";
			vrfCoordinatorFee = "2.0";

			await deploy("ERC721Mock", {
				from: deployer,
				args: ["NFT", "NFT", "ipfs://ERC721Mock/"],
				log: true,
			});

			await deploy("ERC1155Mock", {
				from: deployer,
				args: ["ipfs://ERC1155Mock/{id}"],
				log: true,
			});

			await deploy("NonCompliantContract", {
				from: deployer,
				args: [],
				log: true,
			});
		}
	}

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

		console.log(`Processing category ${JSON.stringify(category)}`);

		for (let j = 0; j < category.supply; j++) {
			const tokenId = category.startingTokenId + j;
			const metadata: ERC721Metadata = getRandomMetadata(
				tokenId,
				categories[i],
				imageFolder.files
			);

			// console.log(`Writing metadata for tokenId ${tokenId} to file ...`);
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
			vrfCoordinatorAddress,
			linkAddress,
			vrfCoordinatorKeyHash,
			parseEther(vrfCoordinatorFee),
		],
		log: true,
	});

	const Frame: Contract = await ethers.getContractAt(
		"Frame",
		FrameDeploy.address
	);

	// Configure test settings
	if (chainID !== "1" && chainID !== "4") {
		// Send LINK to Frame contract
		const Link: Contract = await ethers.getContractAt(
			"LinkMock",
			linkAddress
		);
		await Link.mint(Frame.address, parseEther("1000000.0"));
		console.log("Minted LINK to Frame...");

		const VRF: Contract = await ethers.getContractAt(
			"VRFCoordinatorMock",
			vrfCoordinatorAddress
		);
		await VRF.setVrfConsumerAddress(Frame.address);
		console.log("Set vrfConsumerAdddress on VRFCoordinatorMock...");
	}

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
func.dependencies = ["LINK", "VRFCoordinator"];
func.tags = ["NFT", "Token", "Frame"];
