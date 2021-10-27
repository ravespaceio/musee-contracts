//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IRentable {
    struct Rental {
        address renter;
        uint256 rentalExpiryBlock;
    }

    /**
     * @notice Triggered when a renter has been set
     *
     * @param _tokenId   Token identifier which is setting a renter
     * @param _renter    The new renter address
     * @param _rentalExpiryBlock The block that the rental expires
     */
    event RenterSet(uint256 indexed _tokenId, address indexed _renter, uint256 _rentalExpiryBlock);

    function setRenter(
        uint256 _tokenId,
        address _renter,
        uint256 _rentalExpiryAtBlock
    ) external payable;

    function getRenter(uint256 _tokenId) external view returns (Rental memory);

    function setRentalPricePerBlock(uint256 _tokenId, uint256 _rentalPrice) external;

    function getRentalPricePerBlock(uint256 _tokenId) external view returns (uint256);
}
