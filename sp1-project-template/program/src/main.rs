// These two lines are necessary for the program to properly compile.
//
// Under the hood, we wrap your main function with some extra code so that it behaves properly
// inside the zkVM.
#![no_main]
sp1_zkvm::entrypoint!(main);

use alloy_sol_types::SolType;
use fibonacci_lib::PublicValuesStruct;

// cargo prove build
pub fn main() {
    // Read inputs from the prover
    let agent = sp1_zkvm::io::read::<u64>();
    let wbtc_bal = sp1_zkvm::io::read::<u64>();
    let eth_bal = sp1_zkvm::io::read::<u64>();
    let doge_bal = sp1_zkvm::io::read::<u64>();

    // Define the intended bucket of assets
    let intended_wbtc = 10_u64;
    let intended_eth = 30_u64;
    let intended_doge = 60_u64;

    // Check if actual balances match the intended values
    let is_valid =
        wbtc_bal == intended_wbtc && eth_bal == intended_eth && doge_bal == intended_doge;

    // Encode the public values using ABI encoding
    let bytes = PublicValuesStruct::abi_encode(&PublicValuesStruct {
        agentId: agent,
        wbtc: wbtc_bal,
        eth: eth_bal,
        doge: doge_bal,
        isValid: is_valid as u64,
    });

    // Commit the ABI-encoded bytes
    sp1_zkvm::io::commit_slice(&bytes);
}
