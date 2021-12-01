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
import { BigNumberish } from "ethers";

chai.use(chaiAsPromised);
const expect = chai.expect;

let owner: SignerWithAddress;
let minter1: SignerWithAddress;
let minter2: SignerWithAddress;
let minter3: SignerWithAddress;
let Frame: ethersTypes.Contract;
let VRFCoordinator: ethersTypes.Contract;
let ExhibitMock: ethersTypes.Contract;

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

	ExhibitMock = await ethers.getContractAt(
		"ERC721Mock",
		(await deployments.get("ERC721Mock")).address
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

describe("Frame Exhibiting", () => {

    before(async function () {});

	beforeEach(async () => {
		await deploy();
	});
	
	it("should set and Exhibit on an owned Frame for another owned ERC-721 compatible NFT", async function () {
		await ExhibitMock.connect(owner).mint(minter1.address);
		const exhibitTokenId = 0;
		const frameTokenId = await mintAndFulfil(Category.K, minter1);
		await expect(Frame.connect(minter1).setExhibit(frameTokenId, ExhibitMock.address, exhibitTokenId)).to.emit(Frame, "ExhibitSet").withArgs(frameTokenId, ExhibitMock.address, exhibitTokenId);
    });
	
	it("should set and Exhibit on an owned Frame for another owned ERC-721 compatible NFT and then clear it", async function () {
		await ExhibitMock.connect(owner).mint(minter1.address);
		const exhibitTokenId = 0;
		const frameTokenId = await mintAndFulfil(Category.K, minter1);
		await expect(Frame.connect(minter1).setExhibit(frameTokenId, ExhibitMock.address, exhibitTokenId)).to.emit(Frame, "ExhibitSet").withArgs(frameTokenId, ExhibitMock.address, exhibitTokenId);
		await expect(Frame.connect(minter1).clearExhibit(frameTokenId)).to.emit(Frame, "ExhibitSet").withArgs(frameTokenId, "0x0000000000000000000000000000000000000000", 0);
    });

	it("should fail to set Exhibit on an owned Frame for an ERC-721 compatible NFT not owned by the Frame owner", async function () {
		await ExhibitMock.connect(owner).mint(minter2.address);
		const exhibitTokenId = 0;
		const frameTokenId = await mintAndFulfil(Category.K, minter1);
		await expect(Frame.connect(minter1).setExhibit(frameTokenId, ExhibitMock.address, exhibitTokenId)).to.be.revertedWith("Frame: Exhibit not owned");
    });

});

describe("Frame Renting", () => {

    before(async function () {});

	beforeEach(async () => {
		await deploy();
	});
	
	it("should mint a Frame and set the rentalPricePerBlock on it", async function () {
		const frameTokenId = await mintAndFulfil(Category.K, minter1);
		await Frame.connect(minter1).setRentalPricePerBlock(frameTokenId, parseEther("0.000000000000000010"));
		const rentalPricePerBlock = await Frame.getRentalPricePerBlock(frameTokenId);
		expect(rentalPricePerBlock).to.equal(parseEther("0.000000000000000010"));
    });

	it("should mint a Frame and set the rentalPricePerBlock on it, then have someone fail to become the Renter without not enough paid for 10 blocks", async function () {
		const frameTokenId = await mintAndFulfil(Category.K, minter1);
		await Frame.connect(minter1).setRentalPricePerBlock(frameTokenId, parseEther("0.000000000000000010"));
		const rentalPricePerBlock = await Frame.getRentalPricePerBlock(frameTokenId);
		expect(rentalPricePerBlock).to.equal(parseEther("0.000000000000000010"));
		const rentalCost : BigNumberish = parseEther("0.000000000000000010").mul(5);
		const currentBlockNumber = await ethers.provider.getBlockNumber();
		await expect(Frame.connect(minter2).setRenter(frameTokenId, minter2.address, currentBlockNumber+10,{value: rentalCost})).to.be.revertedWith("Frame: Rental payment");
    });

	it("should mint a Frame and set the rentalPricePerBlock on it, then have someone become the Renter successfully", async function () {
		const frameTokenId = await mintAndFulfil(Category.K, minter1);
		await Frame.connect(minter1).setRentalPricePerBlock(frameTokenId, parseEther("0.000000000000000010"));
		const rentalPricePerBlock = await Frame.getRentalPricePerBlock(frameTokenId);
		expect(rentalPricePerBlock).to.equal(parseEther("0.000000000000000010"));
		const rentalCost : BigNumberish = parseEther("0.000000000000000010").mul(10);
		const currentBlockNumber = await ethers.provider.getBlockNumber();
		await expect(Frame.connect(minter2).setRenter(frameTokenId, minter2.address, currentBlockNumber+10,{value: rentalCost})).to.emit(Frame, "RenterSet").withArgs(frameTokenId, minter2.address, currentBlockNumber+10);
    });

	it("should mint a Frame and set the rentalPricePerBlock on it, then have someone become the Renter successfully after overpaying", async function () {
		const frameTokenId = await mintAndFulfil(Category.K, minter1);
		await Frame.connect(minter1).setRentalPricePerBlock(frameTokenId, parseEther("0.000000000000000010"));
		const rentalPricePerBlock = await Frame.getRentalPricePerBlock(frameTokenId);
		expect(rentalPricePerBlock).to.equal(parseEther("0.000000000000000010"));
		const rentalCost : BigNumberish = parseEther("0.000000000000000010").mul(100);
		const currentBlockNumber = await ethers.provider.getBlockNumber();
		await expect(Frame.connect(minter2).setRenter(frameTokenId, minter2.address, currentBlockNumber+10,{value: rentalCost})).to.emit(Frame, "RenterSet").withArgs(frameTokenId, minter2.address, currentBlockNumber+10);
    });

});