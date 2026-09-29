// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {Imprint} from "../src/Imprint.sol";

contract Deploy is Script {
    using stdJson for string;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address signer_ = vm.envOr("SIGNER", deployer);
        address owner_ = vm.envOr("OWNER", deployer);
        address ethUsd_ = vm.envOr(
            "ETH_USD",
            block.chainid == 8453 ? address(0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70) : address(0)
        );
        require(ethUsd_ != address(0), "set ETH_USD");

        vm.startBroadcast(pk);
        Imprint nft = new Imprint(signer_, owner_, ethUsd_);
        vm.stopBroadcast();

        string memory obj = "deploy";
        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeAddress(obj, "signer", signer_);
        vm.serializeAddress(obj, "owner", owner_);
        string memory out = vm.serializeAddress(obj, "Imprint", address(nft));
        vm.writeJson(out, "./deployed.json");
    }
}
