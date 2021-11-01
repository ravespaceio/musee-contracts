//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./abstract/Rentable.sol";
import "./abstract/Exhibitionable.sol";
import "./interface/IVersionedContract.sol";
import "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract Frame is IVersionedContract, ReentrancyGuard, Rentable, Exhibitionable, ERC721PresetMinterPauserAutoId {

   using EnumerableSet for EnumerableSet.UintSet;  

    enum Category {A,B,C,D,E,F,G,H,I,J,K} 
    struct CategoryDetail {
        uint256 price;
        uint256 startingTokenId;
        uint256 supply;
        EnumerableSet.UintSet tokenIds;
    }
    mapping(Category => CategoryDetail) private categories;

    uint256 randNonce = 0;

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
 
    function randMod(uint256 _modulus) internal returns(uint256)  {
        randNonce++; 
        return uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, randNonce))) % _modulus;
    }

    function purchase(Category _category) external payable nonReentrant {
        
        CategoryDetail storage category = categories[_category];
        
        require(category.tokenIds.length() > 0, "Frame: Sold out");
        require(msg.value >= category.price, "Frame: Not paid enough");        

        // Note: this randomizer function is not safe and is only used temporarily for test purposes
        // Will be updated with Chainlink VRF - https://docs.chain.link/docs/chainlink-vrf/

        uint256 selection = randMod(category.tokenIds.length());
        uint256 tokenToTransfer = category.tokenIds.at(selection);
        _transfer(address(this), _msgSender(), tokenToTransfer);
        category.tokenIds.remove(tokenToTransfer);
    }

    /**
     * @dev Grants `DEFAULT_ADMIN_ROLE`, `MINTER_ROLE` and `PAUSER_ROLE` to the
     * account that deploys the contract.
     *
     * Token URIs will be autogenerated based on `baseURI` and their token IDs.
     * See {ERC721-tokenURI}.
     */
    constructor() ERC721PresetMinterPauserAutoId("Frame", "FRAME", "https://URI.com/") {
        _setAllCategoryDetail();
        _mintAllCategories();
    }

    function contractURI() public pure returns (string memory) {
        
        return "https://musee-dezental/storefront";

        // This is for the OpenSea storefront and should return data in the following format
        // {
        //     "name": "OpenSea Creatures",
        //     "description": "OpenSea Creatures are adorable aquatic beings primarily for demonstrating what can be done using the OpenSea platform",
        //     "image": "https://openseacreatures.io/image.png",
        //     "external_link": "https://openseacreatures.io",
        //     "seller_fee_basis_points": 100, # Indicates a 1% seller fee.
        //     "fee_recipient": "0xA97F337c39cccE66adfeCB2BF99C1DdC54C2D721" # Where seller fees will be paid to.
        // }
    }

    function _setAllCategoryDetail() internal {
        _setCategoryDetail(Category.A, 270 ether, 1, 0);
        _setCategoryDetail(Category.B, 135 ether, 2, categories[Category.A].startingTokenId + categories[Category.A].supply);
        _setCategoryDetail(Category.C, 81 ether, 6, categories[Category.B].startingTokenId + categories[Category.B].supply);
        _setCategoryDetail(Category.D, 54 ether, 10, categories[Category.C].startingTokenId + categories[Category.C].supply);
        _setCategoryDetail(Category.E, 10.8 ether, 18, categories[Category.D].startingTokenId + categories[Category.D].supply);
        _setCategoryDetail(Category.F, 5.4 ether, 24, categories[Category.E].startingTokenId + categories[Category.E].supply);
        _setCategoryDetail(Category.G, 2.7 ether, 32, categories[Category.F].startingTokenId + categories[Category.F].supply);
        _setCategoryDetail(Category.H, 1.35 ether, 32, categories[Category.G].startingTokenId + categories[Category.G].supply);
        _setCategoryDetail(Category.I, .810 ether, 35, categories[Category.H].startingTokenId + categories[Category.H].supply);
        _setCategoryDetail(Category.J, .270 ether, 40, categories[Category.I].startingTokenId + categories[Category.I].supply);
        _setCategoryDetail(Category.K, 0 ether, 10, categories[Category.J].startingTokenId + categories[Category.J].supply);
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
        _mintCategory(Category.K);
    }

    function _mintCategory(Category _category) internal {
        uint8 index;
        uint256 supply = categories[_category].supply;
        for(index = 0; index < supply; index++){
            mint(address(this));
            categories[_category].tokenIds.add(categories[_category].startingTokenId + index);
        }
    }

    function _setCategoryDetail(Category _category, uint256 _price, uint256 _startingTokenId, uint256 _supply) internal {
        CategoryDetail storage category = categories[_category];
        category.price = _price;
        category.startingTokenId = _startingTokenId;
        category.supply = _supply;
    }
}
