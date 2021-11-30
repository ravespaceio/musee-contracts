//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../interface/IExhibitionable.sol";

abstract contract Exhibitionable is IExhibitionable {
    // Mapping of tokenId to current Exhibit
    mapping(uint256 => Exhibit) private _exhibits;

    function setExhibit(
        uint256 _tokenId,
        address _exhibitContractAddress,
        uint256 _exhibitTokenId
    ) external virtual override {
        _setExhibit(_tokenId, _exhibitContractAddress, _exhibitTokenId);
    }

    function _setExhibit(
        uint256 _tokenId,
        address _exhibitContractAddress,
        uint256 _exhibitTokenId
    ) internal {
        Exhibit storage _exhibit = _exhibits[_tokenId];
        _exhibit.contractAddress = _exhibitContractAddress;
        _exhibit.tokenId = _exhibitTokenId;
        emit ExhibitSet(_tokenId, _exhibit.contractAddress, _exhibit.tokenId);
    }

    function getExhibit(uint256 _tokenId) external view virtual override returns (Exhibit memory) {
        return _exhibits[_tokenId];
    }

    function clearExhibit(uint256 _tokenId) external virtual override {
        _setExhibit(_tokenId, address(0x0), 0);
    }
}