// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ISP1Verifier} from "@sp1-contracts/ISP1Verifier.sol";

struct PublicValuesStruct {
    bytes data;
}

/// @title Verifier.
/// @author Succinct Labs
/// @notice This contract implements a simple example of verifying a proof.
contract Verifier {
    /// @notice The address of the SP1 verifier contract.
    /// @dev This can either be a specific SP1Verifier for a specific version, or the
    ///      SP1VerifierGateway which can be used to verify proofs for any version of SP1.
    ///      For the list of supported verifiers on each chain, see:
    ///      https://github.com/succinctlabs/sp1-contracts/tree/main/contracts/deployments
    address public verifier;

    constructor(address _verifier) {
        verifier = _verifier;
    }

    /// @notice The entrypoint for verifying the proof.
    /// @param _proofBytes The encoded proof.
    /// @param _publicValues The encoded public values.
    function verifyProof(bytes32 _vkey, bytes calldata _publicValues, bytes calldata _proofBytes)
        public
        view
        returns (bytes memory)
    {
        ISP1Verifier(verifier).verifyProof(_vkey, _publicValues, _proofBytes);
        // PublicValuesStruct memory publicValues = abi.decode(_publicValues, (PublicValuesStruct));
        return hex"deadbeef"; // Return some random bytes as requested
    }
}
