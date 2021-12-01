//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";

contract ERC721Mock is ERC721PresetMinterPauserAutoId {
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _baseTokenUri
    ) ERC721PresetMinterPauserAutoId(_name, _symbol, _baseTokenUri) {}
}
