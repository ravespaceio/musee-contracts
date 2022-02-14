import { expect } from "./utils/chai-setup";
import { IPFSFolder } from "../utils/types";
import { pinDirectoryToIPFS, postToArweave } from "../utils/IPFS";
const JEST_TIMEOUT = 600000; // ten minutes

describe("IPFS upload and pinning...", () => {

    let images: IPFSFolder;
    let metadata: IPFSFolder;
    const pinataKey : string  = process.env.PINATA_KEY || "undefined";
    const pinataSecret: string = process.env.PINATA_SECRET || "undefined";
	
    it("Should upload a folder of images to IPFS and pin it with Pinata", async function () {
        images = await pinDirectoryToIPFS(pinataKey, pinataSecret, "./test/utils/test_images",  "/*.jpeg");
		expect(images).to.be.not.empty;
        expect(images).to.have.property("cid");
        expect(images).to.have.property("files");
        expect(images).to.have.property("file");
	});

    it("Should post the same images to Arweave", async function () {        
        for(let i = 0;i<images.files.length;i++){
            const result = await postToArweave(images.files[i].cid);
            expect(result).to.be.not.empty;
        }
	});

    it("Should upload a folder of JSON files to IPFS and pin it with Pinata", async function () {
        metadata = await pinDirectoryToIPFS(pinataKey, pinataSecret, "./test/utils/test_metadata",  "/*");
        expect(metadata).to.be.not.empty;
        expect(metadata).to.have.property("cid");
        expect(metadata).to.have.property("files");
        expect(metadata).to.have.property("file");
	});

}).timeout(JEST_TIMEOUT);