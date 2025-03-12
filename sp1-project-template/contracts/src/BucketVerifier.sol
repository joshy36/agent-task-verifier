// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ISP1Verifier} from "@sp1-contracts/ISP1Verifier.sol";

struct PublicValuesStruct {
    uint64 agentId;
    uint64 wbtc;
    uint64 eth;
    uint64 doge;
    uint64 isValid;
}

contract BucketVerifier {
    address public verifier;

    constructor(address _verifier) {
        verifier = _verifier;
    }

    function verifyProof(bytes32 _vkey, bytes calldata _publicValues, bytes calldata _proofBytes)
        public view returns (uint64, uint64, uint64, uint64, uint64)
    {
        ISP1Verifier(verifier).verifyProof(_vkey, _publicValues, _proofBytes);
        PublicValuesStruct memory publicValues = abi.decode(_publicValues, (PublicValuesStruct));
        return (publicValues.agentId, publicValues.wbtc, publicValues.eth, publicValues.doge, publicValues.isValid);
    }
}