//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./abstract/Rentable.sol";
import "./abstract/Exhibitionable.sol";
import "./interface/IVersionedContract.sol";
import "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Frame is IVersionedContract, ReentrancyGuard, Rentable, Exhibitionable, ERC721PresetMinterPauserAutoId {

    enum Category {A,B,C,D,E,F,G,H,I,J,EXHIBITION}
    mapping(Category => uint256) public categoryPrices;
    mapping(Category => uint8) public categorySupply;

    /**
     * @notice Returns the storage, major, minor, and patch version of the contract.
     * @return The storage, major, minor, and patch version of the contract.
     */
    function getVersionNumber()
        external
        pure
        override
        returns (
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        return (1, 0, 1, 0);
    }

    /**
    *  @notice Enforces a tokenId exists
     */
    modifier tokenExists(uint256 _tokenId) {
        require(_exists(_tokenId), "ERC721: operator query for nonexistent token");
        _;
    }

    /**
     * @notice Enforces a block value is in the future
     */
    modifier blockInFuture(uint256 _block) {
        require(_block > block.timestamp, "Frame: Block must be in future");
        _;
    }

    /**
     * @notice Enforces an address should have the DEFAULT_ADMIN_ROLE (0x00) for the entire contract
     */
    modifier onlyOwner(address _address) {
        require(hasRole(DEFAULT_ADMIN_ROLE, _address), "Frame: Only owner");
        _;
    }

    /**
     * @notice Enforces a tokenId should be owned by an address
     */
    modifier tokenIsOwned(uint256 _tokenId, address _address) {
        address owner = ownerOf(_tokenId);
        require(owner == _address, "Frame: Token not owned");
        _;
    }

    /**
     * @notice Enforces a tokenId should be owned or rented by an address
     */
    modifier tokenIsRentedOrOwned(uint256 _tokenId, address _address) {       
        address owner = ownerOf(_tokenId);
        bool owned = owner == _address;
        Rental memory tokenRental = Rentable(this).getRenter(_tokenId);
        bool rented = tokenRental.renter == _address;
        require(owned || rented, "Frame: Token not owned or rented");
        _;
    }

    /**
     * @notice Enforces a token is not currently rented
     */
    modifier tokenNotRented(uint256 _tokenId) {       
        Rental memory tokenRental = Rentable(this).getRenter(_tokenId);
        require(tokenRental.rentalExpiryBlock == 0 || tokenRental.rentalExpiryBlock < block.number, "Frame: Token currently already rented");
        _;
    }

    /**
     * @dev Rentable implementation overrides
     *
     */
    function setRenter(uint256 _tokenId, address _renter, uint256 _rentalExpiryAtBlock) external override payable tokenExists(_tokenId) tokenNotRented(_tokenId) blockInFuture(_rentalExpiryAtBlock) nonReentrant {
        
        // Calculate rent
        uint256 rentalCostPerBlock = Rentable(this).getRentalPricePerBlock(_tokenId);
        uint256 rentalCost = (_rentalExpiryAtBlock - block.number) * rentalCostPerBlock;
        require(msg.value >= rentalCost, "Frame: Rental payment not supplied");

        // Send to owner
        address payable tokenOwner = payable(ownerOf(_tokenId));
        _transfer(tokenOwner, rentalCost);

        // Send change to renter (if any)
        uint256 change = msg.value - rentalCost;
        address payable renter = payable(_msgSender());
        if(change > 0){
            _transfer(renter, change);
        }

        // Rent
        Rentable(this).setRenter(_tokenId, _renter, _rentalExpiryAtBlock);
    }

    function _transfer(address payable _to, uint _amount) public {
        (bool success, ) = _to.call{value: _amount}("");
        require(success, "Frame: Failed to send Ether");
    }

    function setRentalPricePerBlock(uint256 _tokenId, uint256 _rentalPrice) external override tokenExists(_tokenId) tokenIsOwned(_tokenId, _msgSender()){
        Rentable(this).setRentalPricePerBlock(_tokenId, _rentalPrice);
    }
     
    /**
     * @dev Exhibitionable implementation overrides
     *
     */
    function setExhibit(uint256 _tokenId, address _exhibitContractAddress, uint256 _exhibitTokenId) external override tokenExists(_tokenId) tokenIsRentedOrOwned(_tokenId, _msgSender()){
        Exhibitionable(this).setExhibit(_tokenId, _exhibitContractAddress, _exhibitTokenId);
    }

    function clearExhibit(uint256 _tokenId) external override tokenExists(_tokenId) tokenIsRentedOrOwned(_tokenId, _msgSender()){
        Exhibitionable(this).clearExhibit(_tokenId);
    }

    /**
     * @dev Sale functions
     *
     */
    function purchase(Category _category) external payable nonReentrant {
        require(categorySupply[_category] > 0, "Frame: Sold out");
        uint256 purchaseCost = categoryPrices[_category];
        require(msg.value >= (purchaseCost), "Frame: Not paid enough");
    }

    /**
     * @dev Grants `DEFAULT_ADMIN_ROLE`, `MINTER_ROLE` and `PAUSER_ROLE` to the
     * account that deploys the contract.
     *
     * Token URIs will be autogenerated based on `baseURI` and their token IDs.
     * See {ERC721-tokenURI}.
     */
    constructor() ERC721PresetMinterPauserAutoId("Frame", "FRAME", "https://URI.com/") {
        _setAllPricesAndSupply();
        _mintAllCategories();
    }

    function contractURI() public pure returns (string memory) {
        
        return "https://musee-dezental/storefront";

        // This is for the OpenSea storefront and should return data in the following format
        // {
        //     "name": "OpenSea Creatures",
        //     "description": "OpenSea Creatures are adorable aquatic beings primarily for demonstrating what can be done using the OpenSea platform. Adopt one today to try out all the OpenSea buying, selling, and bidding feature set.",
        //     "image": "https://openseacreatures.io/image.png",
        //     "external_link": "https://openseacreatures.io",
        //     "seller_fee_basis_points": 100, # Indicates a 1% seller fee.
        //     "fee_recipient": "0xA97F337c39cccE66adfeCB2BF99C1DdC54C2D721" # Where seller fees will be paid to.
        // }
    }

    function _setAllPricesAndSupply() internal {
        _setPriceAndSupply(Category.A, 270 ether, 1);
        _setPriceAndSupply(Category.B, 135 ether, 2);
        _setPriceAndSupply(Category.C, 81 ether, 6);
        _setPriceAndSupply(Category.D, 54 ether, 10);
        _setPriceAndSupply(Category.E, 10.8 ether, 18);
        _setPriceAndSupply(Category.F, 5.4 ether, 24);
        _setPriceAndSupply(Category.G, 2.7 ether, 32);
        _setPriceAndSupply(Category.H, 1.35 ether, 32);
        _setPriceAndSupply(Category.I, .810 ether, 35);
        _setPriceAndSupply(Category.J, .270 ether, 40);
        _setPriceAndSupply(Category.EXHIBITION, 0 ether, 10);
    }

    function _mintAllCategories() internal {
        _mintCategory(Category.A);
        _mintCategory(Category.B);
        _mintCategory(Category.C);
        _mintCategory(Category.D);
        _mintCategory(Category.E);
        _mintCategory(Category.F);
        _mintCategory(Category.G);
        _mintCategory(Category.H);
        _mintCategory(Category.I);
        _mintCategory(Category.J);
        _mintCategory(Category.EXHIBITION);
    }

    function _mintCategory(Category _category) internal {
        uint8 index;
        for(index = 0; index < categorySupply[_category]; index++){
            mint(address(this));
        } 
    }

    function setPrice(Category _category, uint256 _price) public onlyOwner(_msgSender()) {
        categoryPrices[_category] = _price;
    }

    function setSupply(Category _category, uint8 _supply) public onlyOwner(_msgSender()) {
        categorySupply[_category] = _supply;
    }

    function _setPriceAndSupply(Category _category, uint256 _price, uint8 _supply) internal {
        categoryPrices[_category] = _price;
        categorySupply[_category] = _supply;
    }
}
