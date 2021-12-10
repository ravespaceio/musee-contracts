//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./abstract/Rentable.sol";
import "./abstract/Exhibitionable.sol";
import "./interface/IVersionedContract.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
import "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract Frame is
    IVersionedContract,
    ReentrancyGuard,
    Rentable,
    Exhibitionable,
    ERC721PresetMinterPauserAutoId,
    VRFConsumerBase
{
    using EnumerableSet for EnumerableSet.UintSet;
    string public contractURI;

    enum Category {
        A,
        B,
        C,
        D,
        E,
        F,
        G,
        H,
        I,
        J,
        K
    }
    struct CategoryDetail {
        uint256 price;
        uint256 startingTokenId;
        uint256 supply;
        EnumerableSet.UintSet tokenIds;
    }
    mapping(Category => CategoryDetail) internal categories;
    mapping(bytes32 => address) public requestIdToSender;
    mapping(bytes32 => Category) public requestIdToCategory;
    mapping(bytes32 => uint256) public requestIdToTokenId;

    bytes32 internal keyHash;
    uint256 internal fee = 0.1 * 10**18; // 0.1 LINK (Varies by network)
    bool internal categoriesInitialized = false;

    event MintRequest(bytes32 indexed _requestId, address indexed _address);
    event MintFulfilled(
        bytes32 indexed _requestId,
        address indexed _address,
        uint256 indexed _tokenId
    );
    event LinkWithdrawn(address indexed _to, uint256 _value);
    event EtherWithdrawn(address indexed _to, uint256 _value);

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
        return (1, 0, 2, 0);
    }

    /**
     *  @notice Enforces categories have been initialized
     */
    modifier categoriesReady() {
        require(categoriesInitialized, "Frame: Not ready");
        _;
    }

    /**
     *  @notice Enforces a valid category
     */
    modifier validCategory(Category category) {
        require(category <= Category.K, "Frame: Invalid Category");
        require(category >= Category.A, "Frame: Invalid Category");
        _;
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
        require(_block > block.number, "Frame: Block not in future");
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
        require(_tokenIsOwned(_tokenId, _address), "Frame: Not the Owner");
        _;
    }

    /**
     * @notice Enforces a tokenId should rented by an address
     */
    modifier tokenIsRented(uint256 _tokenId, address _address) {
        require(_tokenIsRented(_tokenId, _address), "Frame: Not the Renter");
        _;
    }

    /**
     * @notice Enforces an Exhibit is owned by the user
     */
    modifier ownsExhibit(
        address _exhibitor,
        address _exhibitContractAddress,
        uint256 _exhibitTokenId
    ) {
        require(
            Exhibitionable(this).exhibitIsOwnedBy(
                _exhibitor,
                _exhibitContractAddress,
                _exhibitTokenId
            ),
            "Frame: Exhibit not valid"
        );
        _;
    }

    /**
     * @notice Enforces a token is not currently rented
     */
    modifier tokenNotRented(uint256 _tokenId) {
        require(!_isCurrentlyRented(_tokenId), "Frame: Token already rented");
        _;
    }

    /**
     * @notice Enforces a token has a rentalPricePerBlock configured
     */
    modifier rentalPriceSet(uint256 _tokenId) {
        require(Rentable(this).getRentalPricePerBlock(_tokenId) > 0, "Frame: Rental price not set");
        _;
    }

    /**
     * @notice Checks if a token is currently owned by
     * @param _tokenId The token to check is owned
     * @param _address The address to check if it's owned by
     */
    function _tokenIsOwned(uint256 _tokenId, address _address) internal view returns (bool) {
        return _address == ownerOf(_tokenId);
    }

    /**
     * @notice Returns information about a Category
     * @param _category The Category to retrieve
     * @return uint256 The price of the Category in wei
     * @return uint256 The startingTokenId of the Category
     * @return uint256 The total supply of the Category
     * @return uint256 The remaining supply of the Category
     */
    function getCategoryDetail(Category _category) public view returns (uint256,uint256,uint256,uint256){
        CategoryDetail storage category = categories[_category];
        uint256 supplyRemaining = category.supply - category.tokenIds.length();
        return (category.price, category.startingTokenId, category.supply, supplyRemaining);
    }

    /**
     * @notice Checks if a token is currently rented by
     * @param _tokenId The token to check is rented
     * @param _address The address to check if it's rented by
     */
    function _tokenIsRented(uint256 _tokenId, address _address) internal view returns (bool) {
        Rental memory tokenRental = Rentable(this).getRenter(_tokenId);
        return tokenRental.renter == _address;
    }

    /**
     * @notice Checks if a token is currently rented by anyone
     * @param _tokenId The token to check is rented
     */
    function isCurrentlyRented(uint256 _tokenId) public view returns (bool) {
        return _isCurrentlyRented(_tokenId);
    }

    /**
     * @notice Checks if a token is currently rented
     * @param _tokenId The token to check is rented
     */
    function _isCurrentlyRented(uint256 _tokenId) internal view returns (bool) {
        Rental memory tokenRental = Rentable(this).getRenter(_tokenId);
        return
            (tokenRental.rentalExpiryBlock != 0) || (tokenRental.rentalExpiryBlock > block.number);
    }

    /**
     * @dev Rentable implementation overrides
     *
     */
    function setRenter(
        uint256 _tokenId,
        address _renter,
        uint256 _rentalExpiryAtBlock
    )
        external
        payable
        override
        tokenExists(_tokenId)
        tokenNotRented(_tokenId)
        blockInFuture(_rentalExpiryAtBlock)
        rentalPriceSet(_tokenId)
        nonReentrant
    {
        // Calculate rent
        uint256 rentalCostPerBlock = Rentable(this).getRentalPricePerBlock(_tokenId);
        uint256 rentalCost = (_rentalExpiryAtBlock - block.number) * rentalCostPerBlock;
        require(msg.value >= rentalCost, "Frame: Rental payment");

        // Send to owner
        address payable tokenOwner = payable(ownerOf(_tokenId));
        _transfer(tokenOwner, rentalCost);

        // Send change to renter (if any)
        uint256 change = msg.value - rentalCost;
        address payable renter = payable(_msgSender());
        if (change > 0) {
            _transfer(renter, change);
        }

        // Rent
        _setRenter(_tokenId, _renter, _rentalExpiryAtBlock);
    }

    function _transfer(address payable _to, uint256 _amount) internal {
        (bool success, ) = _to.call{value: _amount}("");
        require(success, "Frame: Failed to send ETH");
    }

    function setRentalPricePerBlock(uint256 _tokenId, uint256 _rentalPrice)
        external
        override
        tokenExists(_tokenId)
        tokenIsOwned(_tokenId, _msgSender())
    {
        _setRentalPricePerBlock(_tokenId, _rentalPrice);
    }

    function _verifyOwnership(address _ownerOrRenter, uint256 _tokenId)
        internal
        view
        returns (bool)
    {
        if (_isCurrentlyRented(_tokenId)) {
            bool rented = _tokenIsRented(_tokenId, _ownerOrRenter);
            require(rented, "Frame: Not the Renter");
            return rented;
        } else {
            bool owned = _tokenIsOwned(_tokenId, _ownerOrRenter);
            require(owned, "Frame: Not the Owner");
            return owned;
        }
    }

    /**
     * @dev Exhibitionable implementation overrides
     *
     */
    function setExhibit(
        uint256 _tokenId,
        address _exhibitContractAddress,
        uint256 _exhibitTokenId
    )
        external
        override
        tokenExists(_tokenId)
        ownsExhibit(_msgSender(), _exhibitContractAddress, _exhibitTokenId)
        nonReentrant
    {
        _verifyOwnership(_msgSender(), _tokenId);
        _setExhibit(_tokenId, _exhibitContractAddress, _exhibitTokenId);
    }

    function clearExhibit(uint256 _tokenId) external override tokenExists(_tokenId) nonReentrant {
        _verifyOwnership(_msgSender(), _tokenId);
        _clearExhibit(_tokenId);
    }

    /**
     * @dev Grants `DEFAULT_ADMIN_ROLE`, `MINTER_ROLE` and `PAUSER_ROLE` to the
     * account that deploys the contract.
     */
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _baseTokenUri,
        string memory _contractUri,
        address _vrfCoordinator,
        address _link,
        bytes32 _keyHash,
        uint256 _fee
    )
        ERC721PresetMinterPauserAutoId(_name, _symbol, _baseTokenUri)
        VRFConsumerBase(_vrfCoordinator, _link)
    {
        // Used to generate a metadata location for the entire contract
        // commonly used on secondary marketplaces like OpenSea to display collection information
        contractURI = _contractUri;

        // Used to requestRandomness from VRFConsumerBase
        fee = _fee;
        keyHash = _keyHash;
    }

    function setCategoryDetail(
        Category _category,
        uint256 _price,
        uint256 _startingTokenId,
        uint256 _supply
    ) external onlyOwner(_msgSender()) validCategory(_category) {
        CategoryDetail storage category = categories[_category];
        category.price = _price;
        category.startingTokenId = _startingTokenId;
        category.supply = _supply;

        uint256 j;
        for (j = _startingTokenId; j < (_startingTokenId + _supply); j++) {
            category.tokenIds.add(j);
        }
    }

    function setCategoriesInitialized() external onlyOwner(_msgSender()) {
        categoriesInitialized = true;
    }

    function mintFrame(Category _category)
        external
        payable
        categoriesReady
        validCategory(_category)
        nonReentrant
    {
        CategoryDetail storage category = categories[_category];
        require(category.tokenIds.length() > 0, "Frame: Sold out");
        require(msg.value == category.price, "Frame: Incorrect payment for category");
        require(LINK.balanceOf(address(this)) >= fee, "Frame: Not enough LINK");

        bytes32 requestId = requestRandomness(keyHash, fee);
        requestIdToSender[requestId] = _msgSender();
        requestIdToCategory[requestId] = _category;

        emit MintRequest(requestId, _msgSender());
    }

    function fulfillRandomness(bytes32 requestId, uint256 randomNumber) internal override {
        address minter = requestIdToSender[requestId];
        CategoryDetail storage category = categories[requestIdToCategory[requestId]];

        uint256 tokensReminingInCategory = category.tokenIds.length();
        uint256 tokenIdToAllocate;

        if (tokensReminingInCategory > 1)
            tokenIdToAllocate = category.tokenIds.at(randomNumber % tokensReminingInCategory);
        else tokenIdToAllocate = category.tokenIds.at(0);

        category.tokenIds.remove(tokenIdToAllocate);
        requestIdToTokenId[requestId] = tokenIdToAllocate;
        _safeMint(minter, tokenIdToAllocate);

        emit MintFulfilled(requestId, minter, tokenIdToAllocate);
    }

    function withdrawAllLink(address payable _to) external onlyOwner(_msgSender()) nonReentrant {
        uint256 linkBalance = LINK.balanceOf(address(this));
        require(LINK.transfer(_msgSender(), linkBalance), "Frame: Error sending LINK");
        emit LinkWithdrawn(_to, linkBalance);
    }

    function withdrawEther(address payable _to, uint256 _value)
        external
        onlyOwner(_msgSender())
        nonReentrant
    {
        _transfer(_to, _value);
        emit EtherWithdrawn(_to, _value);
    }
}
