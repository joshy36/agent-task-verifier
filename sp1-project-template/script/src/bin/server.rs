use alloy::{
    network::Ethereum,
    primitives::{Address, U256},
    providers::{Provider, ProviderBuilder},
    sol,
};
use alloy_sol_types::SolType;
use axum::{routing::post, Json, Router};
use clap::ValueEnum;
use fibonacci_lib::PublicValuesStruct;
use serde::{Deserialize, Serialize};
use sp1_sdk::{
    include_elf, HashableKey, ProverClient, SP1ProofWithPublicValues, SP1Stdin, SP1VerifyingKey,
};
use std::net::SocketAddr;
use std::path::PathBuf;
use tracing::{error, info, trace};

// ELF file from the program (update path after compiling the new zkVM program)
pub const BUCKET_ELF: &[u8] = include_elf!("bucket-program");

// sol! {
//     struct PublicValuesStruct {
//         uint64 agentId;
//         uint64 wbtc;
//         uint64 eth;
//         uint64 doge;
//         uint64 isValid;
//     }
// }

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SP1BucketProofFixture {
    agent: String,         // Hex-encoded agent ID
    wbtc_bal: String,      // Hex-encoded balance
    eth_bal: String,       // Hex-encoded balance
    doge_bal: String,      // Hex-encoded balance
    is_valid: bool,        // Proof validity
    vkey: String,          // Verification key
    public_values: String, // Hex-encoded raw public values
    proof: String,         // Hex-encoded proof bytes
}

#[derive(Deserialize, Debug)]
struct ProofRequest {
    agent: String,
    system: Option<String>,
}

#[derive(Serialize, Debug)]
struct ProofResponse {
    agent: String,
    wbtc_bal: String,
    eth_bal: String,
    doge_bal: String,
    is_valid: bool,
    vkey: String,
    public_values: Vec<String>, // Array of committed values
    proof: String,
}

#[derive(Copy, Clone, PartialEq, Eq, ValueEnum, Debug)]
enum ProofSystem {
    Core,
    Plonk,
    Groth16,
}

sol! {
    #[sol(rpc)]
    contract IERC20 {
        function balanceOf(address account) public view returns(uint256);
    }
}

async fn get_balance<P: Provider<Ethereum> + 'static>(
    provider: &P,
    token_address: Address,
    account: Address,
) -> Result<U256, Box<dyn std::error::Error>> {
    trace!(
        "Entering get_balance for account {:?} and token {:?}",
        account,
        token_address
    );
    info!(
        "Fetching balance for account {:?} at token {:?}",
        account, token_address
    );

    let contract = IERC20::new(token_address, provider);
    trace!("Created IERC20 contract instance at {:?}", token_address);

    let balance_return = contract.balanceOf(account).call().await?;
    info!("Balance fetched: {:?}", balance_return._0);
    trace!("Exiting get_balance with balance: {:?}", balance_return._0);

    Ok(balance_return._0)
}

async fn generate_proof_handler(
    Json(payload): Json<ProofRequest>,
) -> Result<Json<ProofResponse>, String> {
    sp1_sdk::utils::setup_logger();
    info!("Received proof request: {:?}", payload);
    trace!(
        "Starting proof generation process for agent: {}",
        payload.agent
    );

    let system = match payload.system.as_deref() {
        Some("core") => ProofSystem::Core,
        Some("plonk") => ProofSystem::Plonk,
        Some("groth16") | None => ProofSystem::Groth16,
        Some(other) => {
            error!("Invalid proof system specified: {}", other);
            return Err(format!("Invalid proof system: {}", other));
        }
    };
    info!("Selected proof system: {:?}", system);

    let client = ProverClient::from_env();
    trace!("Initialized ProverClient");

    let (pk, vk) = client.setup(BUCKET_ELF);
    info!("Set up proving and verification keys");

    let (agent_addr, wbtc_bal, eth_bal, doge_bal) =
        fetch_balances(&payload.agent).await.map_err(|e| {
            error!("Failed to fetch balances: {}", e);
            e.to_string()
        })?;
    info!(
        "Fetched balances - WBTC: {:?}, ETH: {:?}, DOGE: {:?}",
        wbtc_bal, eth_bal, doge_bal
    );

    // Convert balances to whole token units (u64) with detailed logging
    trace!("Starting balance conversion process");
    let wbtc_bal_adjusted = wbtc_bal / U256::from(10).pow(U256::from(18)); // ERC20 WBTC: 18 decimals
    info!(
        "WBTC: Raw balance: {}, Adjusted: {}",
        wbtc_bal, wbtc_bal_adjusted
    );
    let eth_bal_adjusted = eth_bal / U256::from(10).pow(U256::from(18)); // ERC20 ETH: 18 decimals
    info!(
        "ETH: Raw balance: {}, Adjusted: {}",
        eth_bal, eth_bal_adjusted
    );
    let doge_bal_adjusted = doge_bal / U256::from(10).pow(U256::from(18)); // ERC20 DOGE: 18 decimals
    info!(
        "DOGE: Raw balance: {}, Adjusted: {}",
        doge_bal, doge_bal_adjusted
    );

    let agent_id = u64::from_be_bytes(agent_addr.into_array()[0..8].try_into().unwrap()); // Convert Address to u64
    info!("Converted agent address to ID: {}", agent_id);

    // Prepare inputs for zkVM
    let mut stdin = SP1Stdin::new();
    stdin.write(&agent_id);

    // Manual conversion to u64 with detailed logging
    trace!("Converting adjusted balances to u64");
    let wbtc_u64: u64 = wbtc_bal_adjusted.to_string().parse().map_err(|e| {
        error!(
            "WBTC balance conversion failed: {}. Value was: {}",
            e, wbtc_bal_adjusted
        );
        "WBTC balance overflow"
    })?;
    info!("WBTC converted to u64: {}", wbtc_u64);

    let eth_u64: u64 = eth_bal_adjusted.to_string().parse().map_err(|e| {
        error!(
            "ETH balance conversion failed: {}. Value was: {}",
            e, eth_bal_adjusted
        );
        "ETH balance overflow"
    })?;
    info!("ETH converted to u64: {}", eth_u64);

    let doge_u64: u64 = doge_bal_adjusted.to_string().parse().map_err(|e| {
        error!(
            "DOGE balance conversion failed: {}. Value was: {}",
            e, doge_bal_adjusted
        );
        "DOGE balance overflow"
    })?;
    info!("DOGE converted to u64: {}", doge_u64);

    trace!("Writing converted values to stdin");
    stdin.write(&wbtc_u64);
    stdin.write(&eth_u64);
    stdin.write(&doge_u64);

    // Generate proof
    info!("Generating proof using {:?}", system);
    let proof = match system {
        ProofSystem::Core => client.prove(&pk, &stdin).run(),
        ProofSystem::Plonk => client.prove(&pk, &stdin).plonk().run(),
        ProofSystem::Groth16 => client.prove(&pk, &stdin).groth16().run(),
    }
    .expect("failed to generate proof");

    info!("Proof generated successfully");
    info!(
        "Raw public values bytes: {:?}",
        proof.public_values.as_slice()
    );

    // Use create_bucket_proof_fixture to process public values
    let fixture = create_proof_fixture(&proof, &vk, system);

    // Construct response using fixture data
    let response = ProofResponse {
        agent: payload.agent.clone(),
        wbtc_bal: format!("0x{}", hex::encode(wbtc_bal.to_be_bytes::<32>())),
        eth_bal: format!("0x{}", hex::encode(eth_bal.to_be_bytes::<32>())),
        doge_bal: format!("0x{}", hex::encode(doge_bal.to_be_bytes::<32>())),
        is_valid: fixture.is_valid,
        vkey: fixture.vkey.clone(),
        public_values: vec![
            fixture.agent.clone(),
            fixture.wbtc_bal.clone(),
            fixture.eth_bal.clone(),
            fixture.doge_bal.clone(),
            format!("0x{:x}", if fixture.is_valid { 1 } else { 0 }),
        ],
        proof: fixture.proof.clone(),
    };

    info!("Proof response prepared: {:?}", response);
    trace!("Completed proof generation handler");
    Ok(Json(response))
}

async fn fetch_balances(
    agent: &str,
) -> Result<(Address, U256, U256, U256), Box<dyn std::error::Error>> {
    trace!("Entering fetch_balances for agent: {}", agent);

    let agent_addr = Address::parse_checksummed(agent, None).map_err(|e| {
        error!("Failed to parse agent address {}: {}", agent, e);
        Box::new(e) as Box<dyn std::error::Error>
    })?;
    info!("Parsed agent address: {:?}", agent_addr);

    let rpc_url = "https://eth-sepolia.g.alchemy.com/v2/wUfyWSOTH6JHCAlZykmSDjnTBV7MP12H";
    trace!("Connecting to RPC endpoint: {}", rpc_url);
    let provider = ProviderBuilder::new().connect(rpc_url).await?;
    info!("Connected to Ethereum provider");

    let wbtc_addr = Address::parse_checksummed("0xf25e4e1efb5d58888eD81B4F57EfA7F2C8627a5C", None)?;
    let eth_addr = Address::parse_checksummed("0x6B03130617E98A98B40abD02f46c4a9C8443D416", None)?;
    let doge_addr = Address::parse_checksummed("0x393F64252e0a8f9461152Dc9501393dD860f5429", None)?;
    info!(
        "Parsed token addresses - WBTC: {:?}, ETH: {:?}, DOGE: {:?}",
        wbtc_addr, eth_addr, doge_addr
    );

    let wbtc_bal = get_balance(&provider, wbtc_addr, agent_addr).await?;
    info!("WBTC balance fetched: {:?}", wbtc_bal);
    let eth_bal = get_balance(&provider, eth_addr, agent_addr).await?;
    info!("ETH balance fetched: {:?}", eth_bal);
    let doge_bal = get_balance(&provider, doge_addr, agent_addr).await?;
    info!("DOGE balance fetched: {:?}", doge_bal);

    trace!("Exiting fetch_balances with successful balance retrieval");
    Ok((agent_addr, wbtc_bal, eth_bal, doge_bal))
}

#[tokio::main]
async fn main() {
    sp1_sdk::utils::setup_logger();
    info!("Starting server initialization");

    let app = Router::new().route("/generate_proof", post(generate_proof_handler));
    info!("Router configured with /generate_proof endpoint");

    let addr = SocketAddr::from(([127, 0, 0, 1], 3001));
    info!("Server configured to run on {}", addr);

    tokio::spawn(async move {
        info!("Spawning server task");
        if let Err(e) = axum::serve(tokio::net::TcpListener::bind(addr).await.unwrap(), app).await {
            error!("Server failed: {}", e);
        }
        info!("Server shutdown completed");
    });

    info!("Waiting for Ctrl+C signal");
    tokio::signal::ctrl_c().await.unwrap();
    info!("Received shutdown signal, exiting main");
}

fn create_proof_fixture(
    proof: &SP1ProofWithPublicValues,
    vk: &SP1VerifyingKey,
    system: ProofSystem,
) -> SP1BucketProofFixture {
    // Deserialize the raw public values from the zkVM
    let bytes = proof.public_values.as_slice();
    let pv_struct =
        PublicValuesStruct::abi_decode(bytes, false).expect("failed to decode public values");

    // ABI-encode the public values for the Solidity struct (160 bytes)
    let abi_encoded = PublicValuesStruct::abi_encode(&PublicValuesStruct {
        agentId: pv_struct.agentId,
        wbtc: pv_struct.wbtc,
        eth: pv_struct.eth,
        doge: pv_struct.doge,
        isValid: pv_struct.isValid,
    });

    // Determine proof bytes based on the proof system
    let proof_bytes = match system {
        ProofSystem::Core => {
            info!("Core proof detected; proof bytes unavailable for on-chain use");
            "0x".to_string() // Placeholder for Core proofs
        }
        ProofSystem::Plonk | ProofSystem::Groth16 => format!("0x{}", hex::encode(proof.bytes())),
    };

    // Create the fixture
    let fixture = SP1BucketProofFixture {
        agent: format!("0x{}", hex::encode(pv_struct.agentId.to_le_bytes())),
        wbtc_bal: format!("0x{}", hex::encode(pv_struct.wbtc.to_le_bytes())),
        eth_bal: format!("0x{}", hex::encode(pv_struct.eth.to_le_bytes())),
        doge_bal: format!("0x{}", hex::encode(pv_struct.doge.to_le_bytes())),
        is_valid: pv_struct.isValid != 0,
        vkey: vk.bytes32().to_string(),
        public_values: format!("0x{}", hex::encode(abi_encoded)),
        proof: proof_bytes,
    };

    println!("Agent ID: {}", fixture.agent);
    println!("WBTC Balance: {}", fixture.wbtc_bal);
    println!("ETH Balance: {}", fixture.eth_bal);
    println!("DOGE Balance: {}", fixture.doge_bal);
    println!("Is Valid: {}", fixture.is_valid);
    println!("Verification Key: {}", fixture.vkey);
    println!("Public Values (ABI-encoded): {}", fixture.public_values);
    println!("Proof Bytes: {}", fixture.proof);

    let fixture_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("fixtures");
    std::fs::create_dir_all(&fixture_path).expect("failed to create fixture path");
    std::fs::write(
        fixture_path.join(format!("{:?}-bucket-fixture.json", system).to_lowercase()),
        serde_json::to_string_pretty(&fixture).unwrap(),
    )
    .expect("failed to write fixture");

    fixture // Return the fixture
}
