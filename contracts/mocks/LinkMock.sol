//SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";

//used only for testing
contract LinkMock is ERC20PresetMinterPauser {
    constructor(string memory name, string memory symbol) ERC20PresetMinterPauser(name, symbol) {}

    function transferAndCall(
        address to,
        uint256 value,
        bytes calldata data
    ) external pure returns (bool success) {
        return true;
    }
}
