// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ImprintArt} from "./ImprintArt.sol";

interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}

/// @title Imprint
/// @notice Base passport NFT. Mint on the site for $4 paid in ETH. Each wallet
///         gets a unique type from on-chain activity. OpenSea
///         rarity comes from on-chain attributes. Other contracts read
///         `passport(address)` to gate access or price.
contract Imprint {
    string public constant name = "Imprint";
    string public constant symbol = "IMP";

    /// @notice $4 mint, $1 refresh, Chainlink 8-decimal USD.
    uint256 public constant MINT_USD = 4e8;
    uint256 public constant REFRESH_USD = 1e8;

    bytes32 public constant MINT_TYPEHASH =
        keccak256("Mint(address account,bytes32 xId,bytes32 traits,string handle,uint256 deadline)");
    bytes32 public constant REFRESH_TYPEHASH =
        keccak256("Refresh(address account,uint256 tokenId,bytes32 traits,string handle,uint256 deadline)");

    bytes32 public immutable DOMAIN_SEPARATOR;

    address public owner;
    address public signer;
    address public ethUsd;
    bool public paused;
    string public contractURI;
    uint256 public totalSupply;

    mapping(uint256 => address) private _ownerOf;
    mapping(address => uint256) private _balanceOf;
    mapping(uint256 => address) private _tokenApproval;
    mapping(address => mapping(address => bool)) private _operator;

    mapping(uint256 => bytes32) public traitsOf;
    mapping(uint256 => string) public handleOf;
    mapping(uint256 => bytes32) public xIdOf;
    mapping(address => uint256) public mintedToken;
    mapping(bytes32 => uint256) public tokenOfX;
    mapping(address => uint256) public tokenOf;

    error NotOwner();
    error NotAuthorized();
    error Paused();
    error BadPrice();
    error BadSignature();
    error Expired();
    error AlreadyMinted();
    error ZeroAddress();
    error BadHandle();
    error Nonexistent();
    error NotHolder();
    error UnsafeRecipient();
    error StalePrice();

    event Transfer(address indexed from, address indexed to, uint256 indexed id);
    event Approval(address indexed owner, address indexed spender, uint256 indexed id);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event Minted(address indexed account, uint256 indexed id, bytes32 xId, bytes32 traits, string handle);
    event Refreshed(address indexed account, uint256 indexed id, bytes32 traits, string handle);
    event SignerSet(address indexed signer);
    event OwnerSet(address indexed owner);
    event PausedSet(bool paused);
    event ContractURISet(string uri);
    event Withdrawn(address indexed to, uint256 amount);
    event EthUsdSet(address indexed feed);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address signer_, address owner_, address ethUsd_) {
        if (signer_ == address(0) || owner_ == address(0) || ethUsd_ == address(0)) revert ZeroAddress();
        signer = signer_;
        owner = owner_;
        ethUsd = ethUsd_;
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("Imprint")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    // --- utility other contracts call ------------------------------------------------

    /// @notice Holder passport: token id, packed traits, type, rarity score.
    function passport(address account)
        external
        view
        returns (uint256 id, bytes32 traits, string memory typeName, uint256 rarityScore, bool holding)
    {
        id = tokenOf[account];
        holding = id != 0 && _ownerOf[id] == account;
        if (id != 0) {
            traits = traitsOf[id];
            typeName = ImprintArt.typeName(traits);
            rarityScore = ImprintArt.rarityScore(traits);
        }
    }

    function isHolder(address account) public view returns (bool) {
        return _balanceOf[account] > 0;
    }

    function quoteMint() public view returns (uint256) {
        return _usdToWei(MINT_USD);
    }

    function quoteRefresh() public view returns (uint256) {
        return _usdToWei(REFRESH_USD);
    }

    // --- mint / refresh --------------------------------------------------------------

    function mint(bytes32 xId, bytes32 traits, string calldata handle, uint256 deadline, bytes calldata signature)
        external
        payable
    {
        if (paused) revert Paused();
        if (block.timestamp > deadline) revert Expired();
        if (mintedToken[msg.sender] != 0) revert AlreadyMinted();
        if (tokenOfX[xId] != 0) revert AlreadyMinted();
        _checkHandle(handle);

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(MINT_TYPEHASH, msg.sender, xId, traits, keccak256(bytes(handle)), deadline))
            )
        );
        if (_recover(digest, signature) != signer) revert BadSignature();

        uint256 id = ++totalSupply;
        mintedToken[msg.sender] = id;
        tokenOfX[xId] = id;
        traitsOf[id] = traits;
        handleOf[id] = handle;
        xIdOf[id] = xId;
        _mint(msg.sender, id);
        emit Minted(msg.sender, id, xId, traits, handle);
        _takePayment(quoteMint());
    }

    /// @notice Holder updates their own imprint when X / wallet activity grew.
    function refresh(bytes32 traits, string calldata handle, uint256 deadline, bytes calldata signature)
        external
        payable
    {
        if (paused) revert Paused();
        if (block.timestamp > deadline) revert Expired();
        uint256 id = mintedToken[msg.sender];
        if (id == 0 || _ownerOf[id] != msg.sender) revert NotHolder();
        _checkHandle(handle);

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(REFRESH_TYPEHASH, msg.sender, id, traits, keccak256(bytes(handle)), deadline))
            )
        );
        if (_recover(digest, signature) != signer) revert BadSignature();

        traitsOf[id] = traits;
        handleOf[id] = handle;
        emit Refreshed(msg.sender, id, traits, handle);
        _takePayment(quoteRefresh());
    }

    // --- ERC-721 ---------------------------------------------------------------------

    function balanceOf(address account) public view returns (uint256) {
        if (account == address(0)) revert ZeroAddress();
        return _balanceOf[account];
    }

    function ownerOf(uint256 id) public view returns (address) {
        address o = _ownerOf[id];
        if (o == address(0)) revert Nonexistent();
        return o;
    }

    function approve(address spender, uint256 id) external {
        address o = ownerOf(id);
        if (msg.sender != o && !_operator[o][msg.sender]) revert NotAuthorized();
        _tokenApproval[id] = spender;
        emit Approval(o, spender, id);
    }

    function getApproved(uint256 id) external view returns (address) {
        if (_ownerOf[id] == address(0)) revert Nonexistent();
        return _tokenApproval[id];
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operator[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address account, address operator) external view returns (bool) {
        return _operator[account][operator];
    }

    function transferFrom(address from, address to, uint256 id) public {
        if (to == address(0)) revert ZeroAddress();
        address o = ownerOf(id);
        if (from != o) revert NotAuthorized();
        if (msg.sender != o && msg.sender != _tokenApproval[id] && !_operator[o][msg.sender]) {
            revert NotAuthorized();
        }
        _tokenApproval[id] = address(0);
        _balanceOf[from] -= 1;
        _balanceOf[to] += 1;
        _ownerOf[id] = to;
        tokenOf[from] = 0;
        tokenOf[to] = id;
        emit Transfer(from, to, id);
    }

    function safeTransferFrom(address from, address to, uint256 id) external {
        safeTransferFrom(from, to, id, "");
    }

    function safeTransferFrom(address from, address to, uint256 id, bytes memory data) public {
        transferFrom(from, to, id);
        if (to.code.length > 0) {
            (bool ok, bytes memory ret) = to.call(
                abi.encodeWithSelector(0x150b7a02, msg.sender, from, id, data)
            );
            if (!ok || (ret.length >= 32 && bytes4(ret) != bytes4(0x150b7a02))) revert UnsafeRecipient();
        }
    }

    function tokenURI(uint256 id) external view returns (string memory) {
        if (_ownerOf[id] == address(0)) revert Nonexistent();
        return ImprintArt.tokenURI(id, traitsOf[id], handleOf[id]);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 || interfaceId == 0x80ac58cd || interfaceId == 0x5b5e139f
            || interfaceId == 0x2a55205a;
    }

    function royaltyInfo(uint256, uint256 salePrice) external view returns (address, uint256) {
        return (owner, salePrice * 500 / 10_000);
    }

    // --- admin -----------------------------------------------------------------------

    function setSigner(address signer_) external onlyOwner {
        if (signer_ == address(0)) revert ZeroAddress();
        signer = signer_;
        emit SignerSet(signer_);
    }

    function setOwner(address owner_) external onlyOwner {
        if (owner_ == address(0)) revert ZeroAddress();
        owner = owner_;
        emit OwnerSet(owner_);
    }

    function setPaused(bool paused_) external onlyOwner {
        paused = paused_;
        emit PausedSet(paused_);
    }

    function setContractURI(string calldata uri) external onlyOwner {
        contractURI = uri;
        emit ContractURISet(uri);
    }

    function setEthUsd(address ethUsd_) external onlyOwner {
        if (ethUsd_ == address(0)) revert ZeroAddress();
        ethUsd = ethUsd_;
        emit EthUsdSet(ethUsd_);
    }

    function withdraw(address to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        uint256 amount = address(this).balance;
        emit Withdrawn(to, amount);
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert UnsafeRecipient();
    }

    // --- internals -------------------------------------------------------------------

    function _usdToWei(uint256 usd8) private view returns (uint256) {
        (, int256 answer,, uint256 updatedAt,) = AggregatorV3Interface(ethUsd).latestRoundData();
        if (answer <= 0 || updatedAt + 1 hours < block.timestamp) revert StalePrice();
        return usd8 * 1e18 / uint256(answer);
    }

    function _takePayment(uint256 price) private {
        if (msg.value < price) revert BadPrice();
        if (msg.value > price) {
            (bool ok,) = msg.sender.call{value: msg.value - price}("");
            if (!ok) revert UnsafeRecipient();
        }
    }

    function _mint(address to, uint256 id) private {
        _ownerOf[id] = to;
        _balanceOf[to] += 1;
        tokenOf[to] = id;
        emit Transfer(address(0), to, id);
    }

    function _checkHandle(string calldata handle) private pure {
        bytes memory b = bytes(handle);
        if (b.length == 0 || b.length > 32) revert BadHandle();
        for (uint256 i; i < b.length; i++) {
            bytes1 c = b[i];
            bool ok = (c >= 0x30 && c <= 0x39) || (c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A)
                || c == 0x5F || c == 0x2D;
            if (!ok) revert BadHandle();
        }
    }

    function _recover(bytes32 digest, bytes calldata sig) private pure returns (address) {
        if (sig.length != 65) return address(0);
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly ("memory-safe") {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        if (v < 27) v += 27;
        return ecrecover(digest, v, r, s);
    }
}
