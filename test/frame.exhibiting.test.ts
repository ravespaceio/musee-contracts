// @ts-ignore
import * as chai from "./utils/chai-setup";
// @ts-ignore
import chaiAsPromised from "chai-as-promised";
// @ts-ignore
import { deployments, ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import * as ethersTypes from "ethers";
import { Category } from "../utils/types";
import { mintAndFulfill, mintAndFulfillProps } from "./utils/test_utils";

chai.use(chaiAsPromised);
const expect = chai.expect;

let owner: SignerWithAddress;
let minter1: SignerWithAddress;
let minter2: SignerWithAddress;
let minter3: SignerWithAddress;
let Frame: ethersTypes.Contract;
let VRFCoordinator: ethersTypes.Contract;
let ExhibitERC721Mock: ethersTypes.Contract;
let ExhibitERC1155Mock: ethersTypes.Contract;
let NonCompliantContract: ethersTypes.Contract;

const zeroBytes = "0x0000000000000000000000000000000000000000000000000000000000000000";

const deploy = deployments.createFixture(async () => {
	
    await deployments.fixture("Frame", { fallbackToGlobal: false });

	[	owner,
		minter1,
		minter2,
		minter3,
	] = await ethers.getSigners();

	Frame = await ethers.getContractAt(
		"Frame",
		(await deployments.get("Frame")).address
	);

	VRFCoordinator = await ethers.getContractAt(
		"VRFCoordinatorMock",
		(await deployments.get("VRFCoordinatorMock")).address
	);

	ExhibitERC721Mock = await ethers.getContractAt(
		"ERC721Mock",
		(await deployments.get("ERC721Mock")).address
	);
	ExhibitERC1155Mock = await ethers.getContractAt(
		"ERC1155Mock",
		(await deployments.get("ERC1155Mock")).address
	);
	NonCompliantContract = await ethers.getContractAt(
		"NonCompliantContract",
		(await deployments.get("NonCompliantContract")).address
	);

});

describe("Frame Exhibiting", () => {

    before(async function () {});

	beforeEach(async () => {
		await deploy();
        await Frame.connect(owner).setSaleStatus(2);
	});	

	// ERC721
	it("should set and Exhibit on an owned Frame for another owned ERC-721 compatible NFT", async function () {
		await ExhibitERC721Mock.connect(owner).mint(minter1.address);
		const exhibitTokenId = 0;
        const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.K,
			minterSigner: minter1,
			owner
		}
		const frameTokenId = await mintAndFulfill(props);
		await expect(Frame.connect(minter1).setExhibit(frameTokenId, ExhibitERC721Mock.address, exhibitTokenId)).to.emit(Frame, "ExhibitSet").withArgs(frameTokenId, ExhibitERC721Mock.address, exhibitTokenId);
    });

	it("should set and Exhibit on an owned Frame for another owned ERC-721 compatible NFT and retrieve the tokenUri", async function () {
		await ExhibitERC721Mock.connect(owner).mint(minter1.address);
		const exhibitTokenId = 0;
        const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.K,
			minterSigner: minter1,
			owner
		}
		const frameTokenId = await mintAndFulfill(props);
		await expect(Frame.connect(minter1).setExhibit(frameTokenId, ExhibitERC721Mock.address, exhibitTokenId)).to.emit(Frame, "ExhibitSet").withArgs(frameTokenId, ExhibitERC721Mock.address, exhibitTokenId);
		const tokenUri = await Frame.getExhibitTokenURI(frameTokenId);
		expect(tokenUri).to.equal(`ipfs://ERC721Mock/${exhibitTokenId}`);
    });
	
	it("should set and Exhibit on an owned Frame for another owned ERC-721 compatible NFT and then clear it", async function () {
		await ExhibitERC721Mock.connect(owner).mint(minter1.address);
		const exhibitTokenId = 0;
        const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.K,
			minterSigner: minter1,
			owner
		}
		const frameTokenId = await mintAndFulfill(props);
		await expect(Frame.connect(minter1).setExhibit(frameTokenId, ExhibitERC721Mock.address, exhibitTokenId)).to.emit(Frame, "ExhibitSet").withArgs(frameTokenId, ExhibitERC721Mock.address, exhibitTokenId);
		await expect(Frame.connect(minter1).clearExhibit(frameTokenId)).to.emit(Frame, "ExhibitSet").withArgs(frameTokenId, "0x0000000000000000000000000000000000000000", 0);
    });

	it("should fail to set Exhibit on an owned Frame for an ERC-721 compatible NFT not owned by the Frame owner", async function () {
		await ExhibitERC721Mock.connect(owner).mint(minter2.address);
		const exhibitTokenId = 0;
        const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.K,
			minterSigner: minter1,
			owner
		}
		const frameTokenId = await mintAndFulfill(props);
		await expect(Frame.connect(minter1).setExhibit(frameTokenId, ExhibitERC721Mock.address, exhibitTokenId)).to.be.revertedWith("Frame: Exhibit not valid");
    });

	// ERC-1155
	it("should set and Exhibit on an owned Frame for another owned ERC-1155 compatible NFT", async function () {
		await ExhibitERC1155Mock.connect(owner).mint(minter1.address, 0, 1, zeroBytes);
		const exhibitTokenId = 0;
        const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.K,
			minterSigner: minter1,
			owner
		}
		const frameTokenId = await mintAndFulfill(props);
		await expect(Frame.connect(minter1).setExhibit(frameTokenId, ExhibitERC1155Mock.address, exhibitTokenId)).to.emit(Frame, "ExhibitSet").withArgs(frameTokenId, ExhibitERC1155Mock.address, exhibitTokenId);
    });

	it("should set and Exhibit on an owned Frame for another owned ERC-1155 compatible NFT and retrieve the tokenUri", async function () {
		await ExhibitERC1155Mock.connect(owner).mint(minter1.address, 0, 1, zeroBytes);
		const exhibitTokenId = 0;
        const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.K,
			minterSigner: minter1,
			owner
		}
		const frameTokenId = await mintAndFulfill(props);
		await expect(Frame.connect(minter1).setExhibit(frameTokenId, ExhibitERC1155Mock.address, exhibitTokenId)).to.emit(Frame, "ExhibitSet").withArgs(frameTokenId, ExhibitERC1155Mock.address, exhibitTokenId);
		const tokenUri = await Frame.getExhibitTokenURI(frameTokenId);
		expect(tokenUri).to.equal("ipfs://ERC1155Mock/{id}");
    });
	
	it("should set and Exhibit on an owned Frame for another owned ERC-1155 compatible NFT and then clear it", async function () {
		await ExhibitERC1155Mock.connect(owner).mint(minter1.address, 0, 1, zeroBytes);
		const exhibitTokenId = 0;
        const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.K,
			minterSigner: minter1,
			owner
		}
		const frameTokenId = await mintAndFulfill(props);
		await expect(Frame.connect(minter1).setExhibit(frameTokenId, ExhibitERC1155Mock.address, exhibitTokenId)).to.emit(Frame, "ExhibitSet").withArgs(frameTokenId, ExhibitERC1155Mock.address, exhibitTokenId);
		await expect(Frame.connect(minter1).clearExhibit(frameTokenId)).to.emit(Frame, "ExhibitSet").withArgs(frameTokenId, "0x0000000000000000000000000000000000000000", 0);
    });

	it("should set and Exhibit on an owned Frame for another owned ERC-1155 compatible NFT and then retrieve the Exhibit details", async function () {
		await ExhibitERC1155Mock.connect(owner).mint(minter1.address, 0, 1, zeroBytes);
		const exhibitTokenId = 0;
        const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.K,
			minterSigner: minter1,
			owner
		}
		const frameTokenId = await mintAndFulfill(props);
		await expect(Frame.connect(minter1).setExhibit(frameTokenId, ExhibitERC1155Mock.address, exhibitTokenId)).to.emit(Frame, "ExhibitSet").withArgs(frameTokenId, ExhibitERC1155Mock.address, exhibitTokenId);
		const [contractAddress, tokenId] = await Frame.connect(minter1).getExhibit(frameTokenId);
		expect(contractAddress).to.equal(ExhibitERC1155Mock.address);
		expect(tokenId).to.equal(0);
    });

	it("should fail to set Exhibit on an owned Frame for an ERC-1155 compatible NFT not owned by the Frame owner", async function () {
		await ExhibitERC1155Mock.connect(owner).mint(minter2.address, 0, 1, zeroBytes);
		const exhibitTokenId = 0;
        const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.K,
			minterSigner: minter1,
			owner
		}
		const frameTokenId = await mintAndFulfill(props);
		await expect(Frame.connect(minter1).setExhibit(frameTokenId, ExhibitERC1155Mock.address, exhibitTokenId)).to.be.revertedWith("Frame: Exhibit not valid");
    });

	// Non compliant contract
	it("should fail to set Exhibit on an owned random contract which doesn't implement the ERC-165 standards for ERC-721, ERC-1155 (even if it implments portions of either interface)", async function () {
        const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.K,
			minterSigner: minter1,
			owner
		}
		const frameTokenId = await mintAndFulfill(props);
		await expect(Frame.connect(minter1).setExhibit(frameTokenId, NonCompliantContract.address, 0)).to.be.revertedWith("Transaction reverted: function selector was not recognized and there's no fallback function");
    });
});