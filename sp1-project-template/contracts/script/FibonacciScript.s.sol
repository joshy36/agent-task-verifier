// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Script} from "forge-std/Script.sol";
import {Fibonacci} from "../src/Fibonacci.sol";

contract FibonacciScript is Script {
    Fibonacci public fibonacci;

    function run() public {
        address verifier = vm.envAddress("VERIFIER");
        bytes32 programVKey = vm.envBytes32("PROGRAM_VKEY");

        vm.startBroadcast();
        fibonacci = new Fibonacci(verifier, programVKey);
        vm.stopBroadcast();
    }
}