// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {Verifier} from "../src/Verifier.sol";

contract VerifierScript is Script {
    Verifier public verifier;

    function run() public {
        address verifierAddress = vm.envAddress("VERIFIER");

        vm.startBroadcast();
        verifier = new Verifier(verifierAddress);
        vm.stopBroadcast();
    }
}