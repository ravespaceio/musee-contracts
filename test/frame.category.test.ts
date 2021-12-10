// @ts-ignore
import * as chai from "./utils/chai-setup";
// @ts-ignore
import chaiAsPromised from "chai-as-promised";
// @ts-ignore
import { deployments, ethers} from "hardhat";
import { parseEther } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import * as ethersTypes from "ethers";

chai.use(chaiAsPromised);
const expect = chai.expect;

let owner: SignerWithAddress;
let minter1: SignerWithAddress;
let minter2: SignerWithAddress;
let minter3: SignerWithAddress;
let Frame: ethersTypes.Contract;

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
});

describe("Frame Administration", () => {
	
    before(async function () {});

	beforeEach(async () => {
		await deploy();
	});

	it("should get Frame version numbers", async function () {
        const result = await Frame.getVersionNumber();
        expect(result[0]).to.equal(1);
        expect(result[1]).to.equal(0);
        expect(result[2]).to.equal(2);
        expect(result[3]).to.equal(0);
    });

	it("should not be able to setCategoriesInitialized as non-Owner", async function () {
		await expect(
			Frame.connect(minter1).setCategoriesInitialized()
		).to.be.revertedWith(
			"Frame: Only owner"
		);
    });


	it("should be able to setCategoriesInitialized as Owner", async function () {
		await Frame.connect(owner).setCategoriesInitialized();
    });

	it("should not be able to setCategoryDetail as non-Owner", async function () {
		await expect(
			Frame.connect(minter1).setCategoryDetail(
				0,
				parseEther("100.0"),
				0,
				1
			)
		).to.be.revertedWith(
			"Frame: Only owner"
		);
    });

	it("should be able to setCategoryDetail as Owner", async function () {
		await Frame.connect(owner).setCategoryDetail(
				0,
				parseEther("100.0"),
				0,
				1
			);
    });

	it("should not be able to setCategoryDetail for an invalid category (0-10 only)", async function () {
		await expect(
			Frame.connect(owner).setCategoryDetail(
				11,
				parseEther("100.0"),
				0,
				1
			)
		).to.be.revertedWith(
			"Transaction reverted: function was called with incorrect parameters"
		);
    });
	
	it("should return getCategoryDetail for a valid category A (0)", async function () {
		const [a,b,c,d] = await Frame.getCategoryDetail(0);
		expect(a).to.equal(parseEther("100.0"));
		expect(b).to.equal(0);
		expect(c).to.equal(1);
		expect(d).to.equal(0);
    });
	
	it("should fail to return getCategoryDetail for an invalid category Z (25)", async function () {
		await expect(Frame.getCategoryDetail(25)).to.be.revertedWith(
			"Transaction reverted: function was called with incorrect parameters"
		);
    });  

});
