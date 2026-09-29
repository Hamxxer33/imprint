// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Imprint} from "../src/Imprint.sol";

contract MockFeed {
    int256 public answer = 2700e8;
    uint256 public updatedAt;

    constructor() {
        updatedAt = block.timestamp;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (1, answer, updatedAt, updatedAt, 1);
    }
}

contract ImprintTest is Test {
    Imprint internal nft;
    MockFeed internal feed;
    uint256 internal signerPk;
    address internal signer;
    address internal user;
    address internal user2;
    uint256 internal mintWei;
    uint256 internal refreshWei;

    function setUp() public {
        signerPk = 0xA11CE;
        signer = vm.addr(signerPk);
        user = address(0xB0B);
        user2 = address(0xCAFE);
        feed = new MockFeed();
        nft = new Imprint(signer, address(this), address(feed));
        mintWei = nft.quoteMint();
        refreshWei = nft.quoteRefresh();
        vm.deal(user, 1 ether);
        vm.deal(user2, 1 ether);
    }

    function _traits() internal pure returns (bytes32) {
        bytes32 t;
        t |= bytes32(uint256(82) << 248);
        t |= bytes32(uint256(96) << 240);
        t |= bytes32(uint256(170) << 232);
        t |= bytes32(uint256(28) << 224);
        t |= bytes32(uint256(210) << 216);
        t |= bytes32(uint256(37) << 208);
        t |= bytes32(uint256(255) << 200);
        t |= bytes32(uint256(0x111111111111111111111111111111111111111111111111));
        return t;
    }

    function _signMint(address account, bytes32 xId, bytes32 traits, string memory handle, uint256 deadline)
        internal
        view
        returns (bytes memory)
    {
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                nft.DOMAIN_SEPARATOR(),
                keccak256(abi.encode(nft.MINT_TYPEHASH(), account, xId, traits, keccak256(bytes(handle)), deadline))
            )
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        return abi.encodePacked(r, s, v);
    }

    function _signRefresh(address account, uint256 id, bytes32 traits, string memory handle, uint256 deadline)
        internal
        view
        returns (bytes memory)
    {
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                nft.DOMAIN_SEPARATOR(),
                keccak256(abi.encode(nft.REFRESH_TYPEHASH(), account, id, traits, keccak256(bytes(handle)), deadline))
            )
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        return abi.encodePacked(r, s, v);
    }

    function testMintPassportAndUri() public {
        bytes32 xId = keccak256("x:trench");
        bytes32 traits = _traits();
        uint256 deadline = block.timestamp + 600;
        bytes memory sig = _signMint(user, xId, traits, "trench", deadline);

        vm.prank(user);
        nft.mint{value: mintWei}(xId, traits, "trench", deadline, sig);

        assertEq(nft.ownerOf(1), user);
        assertEq(nft.totalSupply(), 1);
        assertTrue(nft.isHolder(user));

        (uint256 id, bytes32 stored, string memory typeName, uint256 score, bool holding) = nft.passport(user);
        assertEq(id, 1);
        assertEq(stored, traits);
        assertTrue(holding);
        assertGt(score, 0);
        assertGt(bytes(typeName).length, 0);

        string memory uri = nft.tokenURI(1);
        assertTrue(bytes(uri).length > 100);
    }

    function testRejectsWrongPrice() public {
        bytes32 xId = keccak256("x:trench");
        bytes32 traits = _traits();
        uint256 deadline = block.timestamp + 600;
        bytes memory sig = _signMint(user, xId, traits, "trench", deadline);
        vm.prank(user);
        vm.expectRevert(Imprint.BadPrice.selector);
        nft.mint{value: mintWei / 2}(xId, traits, "trench", deadline, sig);
    }

    function testOnePerWalletAndX() public {
        bytes32 traits = _traits();
        uint256 deadline = block.timestamp + 600;
        bytes32 xId = keccak256("x:trench");
        bytes memory sig = _signMint(user, xId, traits, "trench", deadline);
        vm.prank(user);
        nft.mint{value: mintWei}(xId, traits, "trench", deadline, sig);

        bytes memory sig2 = _signMint(user, keccak256("x:other"), traits, "other", deadline);
        vm.prank(user);
        vm.expectRevert(Imprint.AlreadyMinted.selector);
        nft.mint{value: mintWei}(keccak256("x:other"), traits, "other", deadline, sig2);

        bytes memory sig3 = _signMint(user2, xId, traits, "trench", deadline);
        vm.prank(user2);
        vm.expectRevert(Imprint.AlreadyMinted.selector);
        nft.mint{value: mintWei}(xId, traits, "trench", deadline, sig3);
    }

    function testRefreshAsHolder() public {
        bytes32 xId = keccak256("x:trench");
        bytes32 traits = _traits();
        uint256 deadline = block.timestamp + 600;
        bytes memory sig = _signMint(user, xId, traits, "trench", deadline);
        vm.prank(user);
        nft.mint{value: mintWei}(xId, traits, "trench", deadline, sig);

        bytes32 next = traits | bytes32(uint256(255) << 240);
        bytes memory rsig = _signRefresh(user, 1, next, "trench", deadline);
        vm.prank(user);
        nft.refresh{value: refreshWei}(next, "trench", deadline, rsig);
        assertEq(nft.traitsOf(1), next);
    }

    function testRoyalty() public view {
        (address recv, uint256 amount) = nft.royaltyInfo(1, 1 ether);
        assertEq(recv, address(this));
        assertEq(amount, 0.05 ether);
    }

    function testQuoteIsFourDollarsInEth() public view {
        // $4 at $2700/ETH = 4e18 / 2700 wei
        assertEq(mintWei, (uint256(4) * 1e18) / 2700);
        assertEq(refreshWei, (uint256(1) * 1e18) / 2700);
    }
}
