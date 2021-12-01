//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IExhibitionable {
    struct Exhibit {
        address contractAddress;
        uint256 tokenId;
    }

    /**
     * @notice Triggered when a a new exhibit has been set
     *
     * @param _tokenId                   Token identifier which is setting an exhibit
     * @param _exhibitContractAddress    The new exhibit contract address
     * @param _exhibitTokenId            The token identifier of the exhibit
     */
    event ExhibitSet(
        uint256 indexed _tokenId,
        address indexed _exhibitContractAddress,
        uint256 _exhibitTokenId
    );

    function setExhibit(
        uint256 _tokenId,
        address _exhibitContractAddress,
        uint256 _exhibitTokenId
    ) external;

    function exhibitIsOwnedBy(
        address _exhibitor,
        address _exhibitContractAddress,
        uint256 _exhibitTokenId
    ) external view returns (bool);

    function clearExhibit(uint256 _tokenId) external;

    function getExhibit(uint256 _tokenId) external view returns (Exhibit memory);
}
