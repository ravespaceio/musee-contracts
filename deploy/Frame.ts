import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { parseEther } from "@ethersproject/units";
import { categories, CategoryDetail } from "../utils/Category";
import {
	ERC721Metadata,
	FrameImage,
	getRandomMetadata,
	uploadImages,
	uploadToIPFS,
} from "../utils/Metadata";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
	// @ts-ignore
	const { deployments, getNamedAccounts, ethers } = hre;
	const { deploy } = deployments;
	const { deployer } = await getNamedAccounts();

	const FrameDeploy = await deploy("Frame", {
		from: deployer,
		args: ["Frame", "FRAME"],
		log: true,
	});

	const Frame = await ethers.getContractAt("Frame", FrameDeploy.address);

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

	console.log(`Uploading images to IPFS and Arweave...`);
	const images: FrameImage[] = await uploadImages();

	console.log(`Randomizing metadata and setting on contract...`);
	for (let i = 0; i < categories.length; i++) {
		const category: CategoryDetail = categories[i];

		console.log(`************************************************`);
		console.log(`Minting NFTs for ${JSON.stringify(category)}`);

		for (let j = 0; j < categories[i].supply; j++) {
			const tokenId = categories[i].startingTokenId + j;
			const metadata: ERC721Metadata = getRandomMetadata(
				tokenId,
				categories[i],
				images
			);

			console.log(`Created random metadata: ${JSON.stringify(metadata)}`);

			const ipfsHash: string = await uploadToIPFS(metadata);
			const uri: string = "ipfs://" + ipfsHash;

			await Frame.ownerMint(deployer, category.category, tokenId, uri);
			console.log(`Minted ${tokenId} to ${deployer}`);
		}
	}
};

export default func;
func.tags = ["NFT", "Token"];
