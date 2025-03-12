// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {CustomToken} from "../src/CustomToken.sol";

contract CustomTokenScript is Script {
    CustomToken public token;

    function run() public {
        string memory name = "Wrapped Bitcoin";
        string memory symbol = "wBTC";
        uint256 initialSupply = 1_000_000 * 10**18;

        vm.startBroadcast();
        token = new CustomToken(name, symbol, initialSupply);
        vm.stopBroadcast();
    }
}