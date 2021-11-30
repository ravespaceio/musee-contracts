// @ts-ignore
import * as chai from "./utils/chai-setup";
// @ts-ignore
import chaiAsPromised from "chai-as-promised";
// @ts-ignore
import { deployments, ethers } from "hardhat";
import { parseEther } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import * as ethersTypes from "ethers";

import { Category } from "../utils/types";
import { categories } from "../utils/category";

chai.use(chaiAsPromised);
const expect = chai.expect;

let owner: SignerWithAddress;
let minter1: SignerWithAddress;
let minter2: SignerWithAddress;
let minter3: SignerWithAddress;
let Frame: ethersTypes.Contract;
let VRFCoordinator: ethersTypes.Contract;

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

});

function getRandomInt(min:number, max:number) : number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function mintAndFulfil(category: Category, minterSigner: SignerWithAddress) : Promise<number> {
		
	// Mint request
	await expect(Frame.connect(minterSigner).mintFrame(category, {value: parseEther(categories[category].price)})).to.emit(Frame, "MintRequest");		
	
	// Retrieve _requestId from MintRequest event
	let filter = Frame?.filters?.MintRequest(null, minterSigner.address);
	let events = await Frame.queryFilter(filter, "latest");
	// @ts-ignore
	const requestId = events[0]?.args["_requestId"];

	// Fulfil minting, randomness is integer category
	await expect(VRFCoordinator.connect(owner).mockRandomNumber(requestId, parseEther(getRandomInt(1,9999999999).toString()))).to.emit(Frame, "MintFulfilled");

	// Retrieve tokenId from MintFulfilled event
	filter = Frame?.filters?.MintFulfilled(null, minterSigner.address);
	events = await Frame.queryFilter(filter, "latest");
	// @ts-ignore
	const tokenId = parseInt(events[0]?.args["_tokenId"]);
	// @ts-ignore
	const minter = events[0]?.args["_address"];

	// console.log(`RequestId ${requestId} fulfilled for ${minter}, tokenId ${tokenId}`);

	// Verify token ownership
	const tokenOwner = await Frame.ownerOf(tokenId);
	expect(tokenOwner).to.equal(minterSigner.address);

	// Verify token is in correct category
	expect(tokenId).to.be.greaterThanOrEqual(categories[category].startingTokenId);
	return tokenId;
}

describe("Frame Minting", () => {
	
    before(async function () {});

	beforeEach(async () => {
		await deploy();
	});

	it("should not allow minter1 to mint Category K with the incorrect price", async function () {
        await expect(Frame.connect(minter1).mintFrame(Category.K, {value: parseEther(categories[Category.J].price)})).to.be.revertedWith("Frame: Incorrect payment for category");
    });

	it("should allow minter1 to mint and emit the MintRequest event", async function () {
        await expect(Frame.connect(minter1).mintFrame(Category.K, {value: parseEther(categories[Category.K].price)})).to.emit(Frame, "MintRequest");
    });

	it("should fail to mint when the category is already sold out, Category A", async function () {
		await mintAndFulfil(Category.A, minter1);
		await expect(Frame.connect(minter2).mintFrame(Category.A, {value: parseEther(categories[Category.A].price)})).to.be.revertedWith("Frame: Sold out");	
    });

	it("should fail to mint when the category is incorrect", async function () {
		await expect(Frame.connect(minter2).mintFrame(Category.K+1, {value: parseEther(categories[Category.K].price)})).to.be.revertedWith("Transaction reverted: function was called with incorrect parameter");	
    });

	it("should fail to mint for Category G is only enough for Category K", async function () {
		await expect(Frame.connect(minter3).mintFrame(Category.G, {value: parseEther(categories[Category.K].price)})).to.be.revertedWith("Frame: Incorrect payment for category");	
    });

	it("should mint and fulfil randomness for minter1, Category A", async function () {
		await mintAndFulfil(Category.A, minter1);
    });

	it("should mint and fulfil randomness for minter1, Category B", async function () {
		await mintAndFulfil(Category.B, minter1);
    });

	it("should mint and fulfil randomness for minter1, Category C", async function () {
		await mintAndFulfil(Category.C, minter1);
    });

	it("should mint and fulfil randomness for minter1, Category D", async function () {
		await mintAndFulfil(Category.D, minter1);
    });

	it("should mint and fulfil randomness for minter1, Category E", async function () {
		await mintAndFulfil(Category.E, minter1);
    });

	it("should mint and fulfil randomness for minter1, Category F", async function () {
		await mintAndFulfil(Category.F, minter1);
    });

	it("should mint and fulfil randomness for minter1, Category G", async function () {
		await mintAndFulfil(Category.G, minter1);
    });

	it("should mint and fulfil randomness for minter1, Category H", async function () {
		await mintAndFulfil(Category.H, minter1);
    });

	it("should mint and fulfil randomness for minter1, Category I", async function () {
		await mintAndFulfil(Category.I, minter1);
    });

	it("should mint and fulfil randomness for minter1, Category J", async function () {
		await mintAndFulfil(Category.J, minter1);
    });

	it("should mint and fulfil randomness for minter1, Category K", async function () {
		await mintAndFulfil(Category.K, minter1);
    });

});

describe.skip("Frame Exhibiting", () => {

    before(async function () {});

	beforeEach(async () => {
		await deploy();
	});
	
	it("should set and Exhibit on an owned Frame for another owned ERC-721 compatible NFT", async function () {
		const exhibitTokenId = await mintAndFulfil(Category.K, minter1);
		const frameTokenId = await mintAndFulfil(Category.K, minter1);
		const balanceOf = await Frame.balanceOf(minter1.address);
		console.log(`frameTokenId ${frameTokenId}, exhibitTokenId ${exhibitTokenId}, balanceOf ${balanceOf}`);
		await expect(Frame.connect(minter1).setExhibit(frameTokenId, Frame.address, exhibitTokenId)).to.emit(Frame, "ExhibitSet").withArgs(frameTokenId, Frame.address, exhibitTokenId);
    });

	it("should fail to set Exhibit on an owned Frame for an ERC-721 compatible NFT not owned by the Frame owner", async function () {
		const exhibitTokenId = await mintAndFulfil(Category.K, minter2);
		const frameTokenId = await mintAndFulfil(Category.K, minter1);
		await expect(Frame.connect(minter1).setExhibit(frameTokenId, Frame.address, exhibitTokenId)).to.be.revertedWith("Frame: Exhibit not owned");
    });

});