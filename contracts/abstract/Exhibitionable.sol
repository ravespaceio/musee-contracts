//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../interface/IExhibitionable.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "hardhat/console.sol";

abstract contract Exhibitionable is IExhibitionable {
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

    function exhibitIsOwnedBy(
        address _exhibitor,
        address _exhibitContractAddress,
        uint256 _exhibitTokenId
    ) external view virtual override returns (bool) {
        if (IERC165(_exhibitContractAddress).supportsInterface(type(IERC721).interfaceId)) {
            // console.log("Exhibit supports ERC721 interface");
            return _erc721ExhibitIsOwnedBy(_exhibitor, _exhibitContractAddress, _exhibitTokenId);
        } else if (IERC165(_exhibitContractAddress).supportsInterface(type(IERC1155).interfaceId)) {
            // console.log("Exhibit supports ERC1155 interface");
            return _erc1155ExhibitIsOwnedBy(_exhibitor, _exhibitContractAddress, _exhibitTokenId);
        } else {
            console.log("Exhibit supports neither ERC721 or ERC1155 interface");
        }
        return false;
    }

    function _erc721ExhibitIsOwnedBy(
        address _exhibitor,
        address _exhibitContractAddress,
        uint256 _exhibitTokenId
    ) internal view returns (bool) {
        address owner = IERC721(_exhibitContractAddress).ownerOf(_exhibitTokenId);
        // console.log("Owner of Exhibit is ", owner);
        // console.log("Exhibitor is ", _exhibitor);
        return IERC721(_exhibitContractAddress).ownerOf(_exhibitTokenId) == _exhibitor;
    }

    function _erc1155ExhibitIsOwnedBy(
        address _exhibitor,
        address _exhibitContractAddress,
        uint256 _exhibitTokenId
    ) internal view returns (bool) {
        return IERC1155(_exhibitContractAddress).balanceOf(_exhibitor, _exhibitTokenId) > 0;
    }

    function getExhibit(uint256 _tokenId) external view virtual override returns (Exhibit memory) {
        return _exhibits[_tokenId];
    }

    function clearExhibit(uint256 _tokenId) external virtual override {
        _clearExhibit(_tokenId);
    }

    function _clearExhibit(uint256 _tokenId) internal {
        _setExhibit(_tokenId, address(0x0), 0);
    }
}
