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
import { mintAndFulfill, mintAndFulfillProps } from "./utils/test_utils";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { isBigNumberish } from "@ethersproject/bignumber/lib/bignumber";

chai.use(chaiAsPromised);
const expect = chai.expect;

let owner: SignerWithAddress;
let minter1: SignerWithAddress;
let minter2: SignerWithAddress;
let minter3: SignerWithAddress;
let Frame: ethersTypes.Contract;
let VRFCoordinator: ethersTypes.Contract;

const PRESALE_ROLE = keccak256(toUtf8Bytes("PRESALE_ROLE"));

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

describe("Frame Minting No Sale", () => {
	
    before(async function () {});

	beforeEach(async () => {
		await deploy();
		await Frame.connect(owner).setSaleStatus(0);
	});

	it("should not allow minter1 to mint Category K when SaleStatus.OFF is in effect", async function () {
        await expect(Frame.connect(minter1).mintFrame(Category.K, {value: parseEther(categories[Category.J].price)})).to.be.revertedWith("Frame: Minting not available");
    });
});	

describe("Frame Minting Pre-Sale", () => {
	
    before(async function () {});

	beforeEach(async () => {
		await deploy();
		await Frame.connect(owner).setSaleStatus(1);
	});

	it("should not allow minter1 to mint Category K when SaleStatus.PRESALE is in effect and minter1 is not whitelisted", async function () {
        await expect(Frame.connect(minter1).mintFrame(Category.G, {value: parseEther(categories[Category.G].price)})).to.be.revertedWith("Frame: Address not on list");
    });

	it("should not allow minter2 to mint Category K when SaleStatus.PRESALE is in effect and minter2 is not whitelisted", async function () {
        await expect(Frame.connect(minter2).mintFrame(Category.F, {value: parseEther(categories[Category.F].price)})).to.be.revertedWith("Frame: Address not on list");
    });

	it("should not allow minter3 to mint Category K when SaleStatus.PRESALE is in effect and minter2 is not whitelisted", async function () {
        await expect(Frame.connect(minter3).mintFrame(Category.C, {value: parseEther(categories[Category.C].price)})).to.be.revertedWith("Frame: Address not on list");
    });

	it("should mint and fulfil randomness for minter1, Category G when SaleStatus.PRESALE is in effect and minter1 is allowlisted", async function () {
		await Frame.connect(owner).grantRole(PRESALE_ROLE, minter1.address);
		const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.G,
			minterSigner: minter1,
			owner
		}
		await mintAndFulfill(props);
    });

	it("should mint and fulfil randomness for minter2, Category F when SaleStatus.PRESALE is in effect and minter2 is allowlisted", async function () {
		await Frame.connect(owner).grantRole(PRESALE_ROLE, minter2.address);
		const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.F,
			minterSigner: minter2,
			owner
		}
		await mintAndFulfill(props);
    });

	it("should mint and fulfil randomness for minter3, Category C when SaleStatus.PRESALE is in effect and minter3 is allowlisted", async function () {
		await Frame.connect(owner).grantRole(PRESALE_ROLE, minter3.address);
		const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.C,
			minterSigner: minter3,
			owner
		}
		await mintAndFulfill(props);
    });
});	

describe("Frame Minting Main-Sale", () => {
	
    before(async function () {});

	beforeEach(async () => {
		await deploy();
		await Frame.connect(owner).setSaleStatus(2);
	});

	it("should not allow minter1 to mint Category K with the incorrect price", async function () {
        await expect(Frame.connect(minter1).mintFrame(Category.K, {value: parseEther(categories[Category.J].price)})).to.be.revertedWith("Frame: Incorrect payment for category");
    });

	it("should allow minter1 to mint and emit the MintRequest event", async function () {
        await expect(Frame.connect(minter1).mintFrame(Category.K, {value: parseEther(categories[Category.K].price)})).to.emit(Frame, "MintRequest");
    });

	it("should fail to mint when the category is already sold out, Category A", async function () {
		const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.A,
			minterSigner: minter1,
			owner
		}
		await mintAndFulfill(props);
		await expect(Frame.connect(minter2).mintFrame(Category.A, {value: parseEther(categories[Category.A].price)})).to.be.revertedWith("Frame: Sold out");	
    });

	it("should fail to mint when the category is incorrect", async function () {
		await expect(Frame.connect(minter2).mintFrame(Category.K+1, {value: parseEther(categories[Category.K].price)})).to.be.revertedWith("Transaction reverted: function was called with incorrect parameter");	
    });

	it("should fail to mint for Category G is only enough for Category K", async function () {
		await expect(Frame.connect(minter3).mintFrame(Category.G, {value: parseEther(categories[Category.K].price)})).to.be.revertedWith("Frame: Incorrect payment for category");	
    });

	it("should mint and fulfil randomness for minter1, Category A", async function () {
		const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.A,
			minterSigner: minter1,
			owner
		}
		await mintAndFulfill(props);
    });

	it("should mint and fulfil randomness for minter1, Category B", async function () {
		const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.B,
			minterSigner: minter1,
			owner
		}
		await mintAndFulfill(props);
    });

	it("should mint and fulfil randomness for minter1, Category C", async function () {
		const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.C,
			minterSigner: minter1,
			owner
		}
		await mintAndFulfill(props);
    });

	it("should mint and fulfil randomness for minter1, Category D", async function () {
		const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.D,
			minterSigner: minter1,
			owner
		}
		await mintAndFulfill(props);
    });

	it("should mint and fulfil randomness for minter1, Category E", async function () {
		const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.E,
			minterSigner: minter1,
			owner
		}
		await mintAndFulfill(props);
    });

	it("should mint and fulfil randomness for minter1, Category F", async function () {
		const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.F,
			minterSigner: minter1,
			owner
		}
		await mintAndFulfill(props);
    });

	it("should mint and fulfil randomness for minter1, Category G", async function () {
		const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.G,
			minterSigner: minter1,
			owner
		}
		await mintAndFulfill(props);
    });

	it("should mint and fulfil randomness for minter1, Category H", async function () {
		const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.H,
			minterSigner: minter1,
			owner
		}
		await mintAndFulfill(props);
    });

	it("should mint and fulfil randomness for minter1, Category I", async function () {
		const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.I,
			minterSigner: minter1,
			owner
		}
		await mintAndFulfill(props);
    });

	it("should mint and fulfil randomness for minter1, Category J", async function () {
		const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.J,
			minterSigner: minter1,
			owner
		}
		await mintAndFulfill(props);
    });

	it("should mint and fulfil randomness for minter1, Category K", async function () {
		const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.K,
			minterSigner: minter1,
			owner
		}
		await mintAndFulfill(props);
    });

	it("should withdraw 50 ETH after minting event", async function () {
		const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.A,
			minterSigner: minter3,
			owner
		}
		await mintAndFulfill(props);
		const balance : ethersTypes.BigNumberish = await owner.getBalance();
		await expect(Frame.connect(owner).withdrawEther(owner.address, parseEther("50"))).to.emit(Frame, "EtherWithdrawn").withArgs(owner.address, parseEther("50"));
		const newBalance : ethersTypes.BigNumberish = await owner.getBalance();
		expect(newBalance.sub(balance).gt(parseEther("49.99999999")));
		expect(newBalance.sub(balance).lt(parseEther("50")));
    });

	it("should withdraw all LINK after minting event", async function () {
		const props : mintAndFulfillProps = {
			VRFCoordinator,
			Frame,
			category: Category.A,
			minterSigner: minter3,
			owner
		}
		await mintAndFulfill(props);
		await expect(Frame.connect(owner).withdrawAllLink(owner.address)).to.emit(Frame, "LinkWithdrawn");
    });
});