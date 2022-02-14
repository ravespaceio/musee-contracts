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
import { BigNumberish } from "ethers";
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
const BLOCKS_PER_DAY = 5760;

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

});

describe("Frame Renting", () => {

    before(async function () {});

	beforeEach(async () => {
		await deploy();
        await Frame.connect(owner).setSaleStatus(2);
	});
	
	it("should mint a Frame and set the rentalPricePerBlock on it", async function () {
        const props : mintAndFulfillProps = {
            VRFCoordinator,
            Frame,
            category: Category.K,
            minterSigner: minter1,
            owner
        }
        const frameTokenId = await mintAndFulfill(props);
		await Frame.connect(minter1).setRentalPricePerBlock(frameTokenId, parseEther("0.000000000000000011"));
		const rentalPricePerBlock = await Frame.getRentalPricePerBlock(frameTokenId);
		expect(rentalPricePerBlock).to.equal(parseEther("0.000000000000000011"));
        const rentalCost = await Frame.calculateRentalCost(frameTokenId, 10);
        expect(rentalCost).to.equal(parseEther("0.000000000000000110"));
    });

	it("should mint a Frame and set the rentalPricePerBlock on it, then have someone fail to become the Renter without not enough paid for 5760 blocks", async function () {
        const props : mintAndFulfillProps = {
            VRFCoordinator,
            Frame,
            category: Category.K,
            minterSigner: minter1,
            owner
        }
        const frameTokenId = await mintAndFulfill(props);
		await Frame.connect(minter1).setRentalPricePerBlock(frameTokenId, parseEther("0.000000000000000010"));
		const rentalPricePerBlock = await Frame.getRentalPricePerBlock(frameTokenId);
		expect(rentalPricePerBlock).to.equal(parseEther("0.000000000000000010"));
        const rentalCost = await Frame.calculateRentalCost(frameTokenId, BLOCKS_PER_DAY-100);
		await expect(Frame.connect(minter2).setRenter(frameTokenId, minter2.address, BLOCKS_PER_DAY, {value: rentalCost})).to.be.revertedWith("Frame: Incorrect payment");
    });

	it("should mint a Frame and set the rentalPricePerBlock on it, then have someone fail to become the Renter paying too much for 5760 blocks", async function () {
        const props : mintAndFulfillProps = {
            VRFCoordinator,
            Frame,
            category: Category.K,
            minterSigner: minter1,
            owner
        }
        const frameTokenId = await mintAndFulfill(props);
		await Frame.connect(minter1).setRentalPricePerBlock(frameTokenId, parseEther("0.000000000000000010"));
		const rentalPricePerBlock = await Frame.getRentalPricePerBlock(frameTokenId);
		expect(rentalPricePerBlock).to.equal(parseEther("0.000000000000000010"));
        const rentalCost = await Frame.calculateRentalCost(frameTokenId, BLOCKS_PER_DAY*2);
		await expect(Frame.connect(minter2).setRenter(frameTokenId, minter2.address, BLOCKS_PER_DAY, {value: rentalCost})).to.be.revertedWith("Frame: Incorrect payment");
    });

	it("should mint a Frame and set the rentalPricePerBlock on it, then have someone become the Renter successfully for 5760 blocks", async function () {
        const props : mintAndFulfillProps = {
            VRFCoordinator,
            Frame,
            category: Category.K,
            minterSigner: minter1,
            owner
        }
        const frameTokenId = await mintAndFulfill(props);
		await Frame.connect(minter1).setRentalPricePerBlock(frameTokenId, parseEther("0.000000000000000010"));
		const rentalPricePerBlock = await Frame.getRentalPricePerBlock(frameTokenId);
		expect(rentalPricePerBlock).to.equal(parseEther("0.000000000000000010"));
        const rentalCost = await Frame.calculateRentalCost(frameTokenId, BLOCKS_PER_DAY);
		const currentBlockNumber = await ethers.provider.getBlockNumber();
        console.log(`Current block number ${currentBlockNumber}`);
        await expect(Frame.connect(minter2).setRenter(frameTokenId, minter2.address, BLOCKS_PER_DAY, {value: rentalCost})).to.emit(Frame, "RenterSet");

        // Double check rental information
        const [renterAddress, rentalExpiryBlock] = await Frame.getRenter(frameTokenId);
        expect(renterAddress).to.equal(minter2.address);
        expect(parseInt(rentalExpiryBlock)).to.be.greaterThanOrEqual(BLOCKS_PER_DAY+currentBlockNumber);
        const isCurrentlyRented = await Frame.isCurrentlyRented(frameTokenId);
        expect(isCurrentlyRented);
        const tokenIsRentedByAddress = await Frame.tokenIsRentedByAddress(frameTokenId, minter2.address);
        expect(tokenIsRentedByAddress);
    });

	it("should mint a Frame and set the rentalPricePerBlock on it at .01 ether per day, then have someone become the Renter successfully for 5760 blocks", async function () {
        const props : mintAndFulfillProps = {
            VRFCoordinator,
            Frame,
            category: Category.K,
            minterSigner: minter1,
            owner
        }
        const frameTokenId = await mintAndFulfill(props);
		await Frame.connect(minter1).setRentalPricePerBlock(frameTokenId, parseEther("0.000001736111111111"));
        const rentalPricePerBlock = await Frame.getRentalPricePerBlock(frameTokenId);
        console.log(`Rental cost per block = ${rentalPricePerBlock}`);
		expect(rentalPricePerBlock).to.equal(parseEther("0.000001736111111111"));
        const rentalCost = await Frame.calculateRentalCost(frameTokenId, BLOCKS_PER_DAY);
        console.log(`Rental cost per day (for 5760 blocks) = ${rentalCost}`);
		await expect(Frame.connect(minter2).setRenter(frameTokenId, minter2.address, BLOCKS_PER_DAY, {value: rentalCost})).to.emit(Frame, "RenterSet");

        // Double check rental information
        const [renterAddress, rentalExpiryBlock] = await Frame.getRenter(frameTokenId);
        expect(renterAddress).to.equal(minter2.address);
        const currentBlockNumber = await ethers.provider.getBlockNumber();
        expect(parseInt(rentalExpiryBlock)).to.be.greaterThanOrEqual(BLOCKS_PER_DAY+currentBlockNumber);
        const isCurrentlyRented = await Frame.isCurrentlyRented(frameTokenId);
        expect(isCurrentlyRented);
        const tokenIsRentedByAddress = await Frame.tokenIsRentedByAddress(frameTokenId, minter2.address);
        expect(tokenIsRentedByAddress);
    });

	it("should mint a Frame and set the rentalPricePerBlock on it, then have someone become the Renter successfully for 5760 blocks, then set an Exhibit", async function () {
        const props : mintAndFulfillProps = {
            VRFCoordinator,
            Frame,
            category: Category.K,
            minterSigner: minter1,
            owner
        }
        const frameTokenId = await mintAndFulfill(props);
		await Frame.connect(minter1).setRentalPricePerBlock(frameTokenId, parseEther("0.000000000000000010"));
		const rentalPricePerBlock = await Frame.getRentalPricePerBlock(frameTokenId);
		expect(rentalPricePerBlock).to.equal(parseEther("0.000000000000000010"));
        const rentalCost = await Frame.calculateRentalCost(frameTokenId, BLOCKS_PER_DAY);
		await expect(Frame.connect(minter2).setRenter(frameTokenId, minter2.address, BLOCKS_PER_DAY, {value: rentalCost})).to.emit(Frame, "RenterSet");

        // Double check rental information
        const [renterAddress, rentalExpiryBlock] = await Frame.getRenter(frameTokenId);
        expect(renterAddress).to.equal(minter2.address);
        const currentBlockNumber = await ethers.provider.getBlockNumber();
        expect(parseInt(rentalExpiryBlock)).to.be.greaterThanOrEqual(BLOCKS_PER_DAY+currentBlockNumber);
        const isCurrentlyRented = await Frame.isCurrentlyRented(frameTokenId);
        expect(isCurrentlyRented);
        const tokenIsRentedByAddress = await Frame.tokenIsRentedByAddress(frameTokenId, minter2.address);
        expect(tokenIsRentedByAddress);

        // Exhibit as the Renter
		await ExhibitERC721Mock.connect(owner).mint(minter2.address);
		const exhibitTokenId = 0;
		await expect(Frame.connect(minter2).setExhibit(frameTokenId, ExhibitERC721Mock.address, exhibitTokenId)).to.emit(Frame, "ExhibitSet").withArgs(frameTokenId, ExhibitERC721Mock.address, exhibitTokenId);
		const tokenUri = await Frame.getExhibitTokenURI(frameTokenId);
		expect(tokenUri).to.equal(`ipfs://ERC721Mock/${exhibitTokenId}`);

    });

	it("should mint a Frame and set the rentalPricePerBlock on it, then have someone become the Renter successfully for 5760 blocks then have someone fail to rent again while it's still rented", async function () {
        const props : mintAndFulfillProps = {
            VRFCoordinator,
            Frame,
            category: Category.K,
            minterSigner: minter1,
            owner
        }
        const frameTokenId = await mintAndFulfill(props);
		await Frame.connect(minter1).setRentalPricePerBlock(frameTokenId, parseEther("0.000000000000000010"));
		const rentalPricePerBlock = await Frame.getRentalPricePerBlock(frameTokenId);
		expect(rentalPricePerBlock).to.equal(parseEther("0.000000000000000010"));
        const rentalCost = await Frame.calculateRentalCost(frameTokenId, BLOCKS_PER_DAY);
		
        // Rent
        await expect(Frame.connect(minter2).setRenter(frameTokenId, minter2.address, BLOCKS_PER_DAY,{value: rentalCost})).to.emit(Frame, "RenterSet");

        // Double check rental information
        const [renterAddress, rentalExpiryBlock] = await Frame.getRenter(frameTokenId);
        expect(renterAddress).to.equal(minter2.address);
        const currentBlockNumber = await ethers.provider.getBlockNumber();
        expect(parseInt(rentalExpiryBlock)).to.be.greaterThanOrEqual(BLOCKS_PER_DAY+currentBlockNumber);
        const isCurrentlyRented = await Frame.isCurrentlyRented(frameTokenId);
        expect(isCurrentlyRented);
        const tokenIsRentedByAddress = await Frame.tokenIsRentedByAddress(frameTokenId, minter2.address);
        expect(tokenIsRentedByAddress);

        // Attempt rent again
		await expect(Frame.connect(minter2).setRenter(frameTokenId, minter2.address, BLOCKS_PER_DAY,{value: rentalCost})).to.be.revertedWith("Frame: Token already rented");
    });

	it("should mint a Frame and set the rentalPricePerBlock on it, then have someone become the Renter successfully for 5760 blocks and verify rental fee is collected", async function () {
        const props : mintAndFulfillProps = {
            VRFCoordinator,
            Frame,
            category: Category.K,
            minterSigner: minter1,
            owner
        }
        const frameTokenId = await mintAndFulfill(props);
		await Frame.connect(minter1).setRentalPricePerBlock(frameTokenId, parseEther("0.000000000000000010"));
		const rentalPricePerBlock = await Frame.getRentalPricePerBlock(frameTokenId);
		expect(rentalPricePerBlock).to.equal(parseEther("0.000000000000000010"));
        const rentalCost = await Frame.calculateRentalCost(frameTokenId, BLOCKS_PER_DAY);

        const rentalFeeNumerator = await Frame.connect(owner).rentalFeeNumerator();
        const rentalFeeDenominator = await Frame.connect(owner).rentalFeeDenominator();
        const expectedRentalFee = rentalCost.mul(rentalFeeNumerator).div(rentalFeeDenominator);
        console.log(`Rental cost total ${rentalCost}`);
        console.log(`Rental fee collected ${expectedRentalFee}`);
        console.log(`Net rental to owner ${rentalCost.sub(expectedRentalFee)}`);

		await expect(Frame.connect(minter2).setRenter(frameTokenId, minter2.address, BLOCKS_PER_DAY, {value: rentalCost})).to.emit(Frame, "RentalFeeCollectedFrom").withArgs(frameTokenId, minter1.address, expectedRentalFee);

        // Double check rental information
        const [renterAddress, rentalExpiryBlock] = await Frame.getRenter(frameTokenId);
        expect(renterAddress).to.equal(minter2.address);
        const currentBlockNumber = await ethers.provider.getBlockNumber();
        expect(parseInt(rentalExpiryBlock)).to.be.greaterThanOrEqual(BLOCKS_PER_DAY+currentBlockNumber);
        const isCurrentlyRented = await Frame.isCurrentlyRented(frameTokenId);
        expect(isCurrentlyRented);
        const tokenIsRentedByAddress = await Frame.tokenIsRentedByAddress(frameTokenId, minter2.address);
        expect(tokenIsRentedByAddress);
    });

});