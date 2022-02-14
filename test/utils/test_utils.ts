// @ts-ignore
import * as chai from "./chai-setup";
// @ts-ignore
import chaiAsPromised from "chai-as-promised";

import * as ethersTypes from "ethers";
import { Category } from "../../utils/types";
import { categories } from "../../utils/category";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseEther } from "@ethersproject/units";

chai.use(chaiAsPromised);
const expect = chai.expect;

export function getRandomInt(min: number, max: number): number {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

export interface mintAndFulfillProps {
	VRFCoordinator: ethersTypes.Contract;
	Frame: ethersTypes.Contract;
	category: Category;
	minterSigner: SignerWithAddress;
	owner: SignerWithAddress;
}

export async function mintAndFulfill(
	props: mintAndFulfillProps
): Promise<number> {
	const { VRFCoordinator, Frame, category, minterSigner, owner } = props;

	// Mint request
	await expect(
		Frame.connect(minterSigner).mintFrame(category, {
			value: parseEther(categories[category].price),
		})
	).to.emit(Frame, "MintRequest");

	// Retrieve _requestId from MintRequest event
	let filter = Frame?.filters?.MintRequest(null, minterSigner.address);
	let events = await Frame.queryFilter(filter, "latest");
	// @ts-ignore
	const requestId = events[0]?.args["_requestId"];

	// Fulfil minting, randomness is integer category
	await expect(
		VRFCoordinator.connect(owner).mockRandomNumber(
			requestId,
			parseEther(getRandomInt(1, 9999999999).toString())
		)
	).to.emit(Frame, "MintFulfilled");

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
	expect(tokenId).to.be.greaterThanOrEqual(
		categories[category].startingTokenId
	);
	return tokenId;
}
