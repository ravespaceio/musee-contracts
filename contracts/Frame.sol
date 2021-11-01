//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./abstract/Rentable.sol";
import "./abstract/Exhibitionable.sol";
import "./interface/IVersionedContract.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract Frame is IVersionedContract, AccessControl, ReentrancyGuard, Rentable, Exhibitionable, ERC721URIStorage {

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

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
     * @notice Enforces an address should have the MINTER_ROLE
     */
    modifier onlyMinter(address _address) {
        require(hasRole(MINTER_ROLE, _address), "Frame: Only minter");
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
    */
    constructor(
        string memory _name,
        string memory _symbol
    ) ERC721(_name, _symbol) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MINTER_ROLE, _msgSender());
        _setupRole(PAUSER_ROLE, _msgSender());
    }

    function contractURI() public pure returns (string memory) {
        
        return "https://musee-dezental.com/storefront";

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

    function ownerMint(address _to, Category _category, uint256 _tokenId, string calldata _metadataURI) external onlyMinter(_msgSender()) nonReentrant {
        _safeMint(_to, _tokenId);
        _setTokenURI(_tokenId, _metadataURI);
        approve(address(this), _tokenId);
        CategoryDetail storage category = categories[_category];
        category.tokenIds.add(_tokenId);
    }

    function setCategoryDetail(Category _category, uint256 _price, uint256 _startingTokenId, uint256 _supply) external onlyOwner(_msgSender()) {
        CategoryDetail storage category = categories[_category];
        category.price = _price;
        category.startingTokenId = _startingTokenId;
        category.supply = _supply;
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControl, ERC721)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
