//SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IFrameMock {
    function rawFulfillRandomness(bytes32 requestId, uint256 randomness) external;
}

contract VRFCoordinatorMock is Ownable {
    address public vrfConsumerAddress;

    constructor() {}

    function setVrfConsumerAddress(address _vrfConsumer) external onlyOwner {
        vrfConsumerAddress = _vrfConsumer;
    }

    function mockRandomNumber(bytes32 _requestId, uint256 _randomness) external onlyOwner {
        IFrameMock(vrfConsumerAddress).rawFulfillRandomness(_requestId, _randomness);
    }
}
