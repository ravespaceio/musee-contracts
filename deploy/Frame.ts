import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { parseEther } from "@ethersproject/units";
import { Contract } from "ethers";
import { categories } from "../utils/category";
import {
	CategoryDetail,
	ERC721Metadata,
	IPFSFile,
	IPFSFolder,
} from "../utils/types";
import { pinDirectoryToIPFS, postToArweave } from "../utils/IPFS";
import { getExactMetadata, writeJSONFile } from "../utils/metadata";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { sleep } from "../utils/utils";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
	// @ts-ignore
	const { deployments, getNamedAccounts, ethers, getChainId } = hre;
	const { deploy } = deployments;
	const { deployer } = await getNamedAccounts();
	const chainID = await getChainId();
	const rinkeby = chainID == "4";
	const mainnet = chainID == "1";
	const local = !rinkeby && !mainnet;

	let vrfCoordinatorAddress: string,
		vrfCoordinatorKeyHash: string,
		vrfCoordinatorFee: string,
		linkAddress: string,
		rentalFeeNumerator: string,
		rentalFeeDenominator: string;

	switch (chainID) {
		// Mainnet
		case "1": {
			linkAddress = "0x514910771AF9Ca656af840dff83E8264EcF986CA";
			vrfCoordinatorAddress =
				"0xf0d54349aDdcf704F77AE15b96510dEA15cb7952";
			vrfCoordinatorKeyHash =
				"0xAA77729D3466CA35AE8D28B3BBAC7CC36A5031EFDC430821C02BC31A238AF445";
			vrfCoordinatorFee = "2.0";
			rentalFeeNumerator = "50";
			rentalFeeDenominator = "1000";
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
			rentalFeeNumerator = "50";
			rentalFeeDenominator = "1000";
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
			rentalFeeNumerator = "500";
			rentalFeeDenominator = "1000";

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
	// Always use the finalised images
	const directoryToUse = local
		? "./test/utils/test_images"
		: "./utils/images";
	const filesToUse = "/*.jpeg";

	console.log(``);
	console.log(
		`*********************************************************************************`
	);
	console.log(
		`Uploading images from ${directoryToUse} with files ${filesToUse} to IPFS...`
	);
	const imageFolder: IPFSFolder = await pinDirectoryToIPFS(
		directoryToUse,
		filesToUse
	);

	// Pin to Arweave the images
	// Don't do it when testing locally, takes too long
	if (!local) {
		console.log(``);
		console.log(
			`*********************************************************************************`
		);
		for (let i = 0; i < imageFolder.files.length; i++) {
			try {
				await postToArweave(imageFolder.files[i].cid);
				console.log(
					`Pinned image ${imageFolder.files[i].file} with cid ${imageFolder.files[i].cid} to Arweave...`
				);
			} catch (err) {
				console.log(
					`Error uploading ${imageFolder.files[i].file} / ${imageFolder.files[i].cid}, will pause 10s and retry once...`
				);
				sleep(10000);
				try {
					await postToArweave(imageFolder.files[i].cid);
					console.log(
						`Pinned image ${imageFolder.files[i].file} with cid ${imageFolder.files[i].cid} to Arweave...`
					);
				} catch (err) {
					console.log(
						`Error uploading ${imageFolder.files[i].file} / ${imageFolder.files[i].cid}, during retry attempt, now skipping...`
					);
				}
			}
		}
	}

	// Create and write JSON metadata locally
	// When testing locally write to the test folder instead
	console.log(``);
	console.log(
		`*********************************************************************************`
	);
	const metadataFolderToUse = local
		? "./test/utils/test_metadata"
		: "./utils/metadata";
	console.log(
		`Creating metadata in folder ${metadataFolderToUse} and uploading to IPFS ...`
	);

	for (let i = 0; i < categories.length; i++) {
		const category: CategoryDetail = categories[i];
		console.log(``);
		console.log(
			`*********************************************************************************`
		);
		console.log(`Processing category ${JSON.stringify(category)}`);
		console.log(``);

		for (let j = 0; j < category.supply; j++) {
			const tokenId = category.startingTokenId + j;

			let imageFile: IPFSFile;
			if (local)
				imageFile = imageFolder.files.filter((file, index) => {
					return file.file == `${directoryToUse}/1.jpeg`;
				})[0];
			else
				imageFile = imageFolder.files.filter((file, index) => {
					return file.file == `${directoryToUse}/${tokenId}.jpeg`;
				})[0];

			console.log(
				`Selected image file ${imageFile.file} with cid ${imageFile.cid} for tokenId ${tokenId}`
			);

			const metadata: ERC721Metadata = getExactMetadata(
				tokenId,
				categories[i],
				imageFile
			);
			console.log(
				`Writing metadata for tokenId ${tokenId} to local file ...`
			);
			await writeJSONFile(metadata, `${tokenId}`, metadataFolderToUse);
		}
	}

	// Upload and pin metadata to IPFS
	console.log(``);
	console.log(
		`*********************************************************************************`
	);
	const metadataFolder: IPFSFolder = await pinDirectoryToIPFS(
		metadataFolderToUse,
		"/*"
	);
	const tokenUri = `ipfs://${metadataFolder.cid}/`;
	console.log(
		`Uploaded and pinned metadata to IPFS with hash ${metadataFolder.cid}`
	);

	// Deploy library
	const ABDKMath64x64Deploy = await deploy("ABDKMath64x64", {
		from: deployer,
	});
	const AllowList = await deploy("AllowList", {
		from: deployer,
	});

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
			rentalFeeNumerator,
			rentalFeeDenominator,
		],
		libraries: {
			ABDKMath64x64: ABDKMath64x64Deploy.address,
			AllowList: AllowList.address,
		},
		log: true,
	});

	const Frame: Contract = await ethers.getContractAt(
		"Frame",
		FrameDeploy.address
	);

	// Configure local test settings
	if (local) {
		console.log(``);
		console.log(
			`*********************************************************************************`
		);

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
	console.log(``);
	console.log(
		`*********************************************************************************`
	);
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

	// Set sale status to off
	console.log(``);
	console.log(
		`*********************************************************************************`
	);
	if (local) {
		await Frame.setSaleStatus(1);
		console.log(`Deploy complete, sale status is SaleStatus.PRESALE`);
	} else if (rinkeby) {
		await Frame.setSaleStatus(1);
		console.log(`Deploy complete, sale status is SaleStatus.PRESALE`);
	} else {
		await Frame.setSaleStatus(0);
		console.log(`Deploy complete, sale status is SaleStatus.OFF`);
	}

	// Set allow list status
	// console.log(``);
	// console.log(`*********************************************************************************`);
	const PRESALE_ROLE = keccak256(toUtf8Bytes("PRESALE_ROLE"));
	// for (let i = 0; i < allowList.length; i++) {
	// 	console.log(`Granting PRESALE_ROLE to ${allowList[i]}`);
	// 	await Frame.grantRole(PRESALE_ROLE, allowList[i]);
	// }

	// If Rinkeby, grant PRESALE_ROLE to Fabu and Tom additionally
	if (rinkeby) {
		await Frame.grantRole(
			PRESALE_ROLE,
			"0xA8668E1639733f070C818a155EEBD69cde93c5f3"
		);
		await Frame.grantRole(
			PRESALE_ROLE,
			"0x830099587797F149f9D989aCb8D83D467e1DF8e6"
		);
	}
};

export default func;
func.tags = ["NFT", "Token", "Frame"];
