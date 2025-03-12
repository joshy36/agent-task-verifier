// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {BucketVerifier} from "../src/BucketVerifier.sol";

contract BucketVerifierScript is Script {
    BucketVerifier public verifier;

    function run() public {
        address verifierAddress = vm.envAddress("VERIFIER");

        vm.startBroadcast();
        verifier = new BucketVerifier(verifierAddress);
        vm.stopBroadcast();
    }
}