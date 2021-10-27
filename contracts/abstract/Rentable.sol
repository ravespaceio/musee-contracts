//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../interface/IRentable.sol";

abstract contract Rentable is IRentable {
    // Mapping of tokenId to current rentalPrice
    // Defaulted to paying back the entire purchase cost in 1 year
    mapping(uint256 => uint256) public _rentalPrices;

    // Mapping of tokenId to current Rental
    // Defaulted to 0x0
    mapping(uint256 => Rental) private _renters;

    function setRenter(
        uint256 _tokenId,
        address _renter,
        uint256 _rentalExpiryAtBlock
    ) external payable virtual override {
        Rental storage rental = _renters[_tokenId];
        rental.renter = _renter;
        rental.rentalExpiryBlock = _rentalExpiryAtBlock;
        emit RenterSet(_tokenId, rental.renter, rental.rentalExpiryBlock);
    }

    function getRenter(uint256 _tokenId) external view virtual override returns (Rental memory) {
        return _renters[_tokenId];
    }

    function setRentalPricePerBlock(uint256 _tokenId, uint256 _rentalPrice)
        external
        virtual
        override
    {
        _rentalPrices[_tokenId] = _rentalPrice;
    }

    function getRentalPricePerBlock(uint256 _tokenId) external view override returns (uint256) {
        return _rentalPrices[_tokenId];
    }
}
