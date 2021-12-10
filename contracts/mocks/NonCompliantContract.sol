//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract NonCompliantContract {
    function ownerOf(uint256 _tokenId) public view returns (address) {
        return msg.sender;
    }

    function balanceOf(address _address, uint256 _tokenId) public view returns (uint256) {
        return 1;
    }
}
