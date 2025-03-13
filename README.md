# Overview

This project is based on task #8:

Proof of receiving an exact bucket of assets (e.g., given a request for “10% wBTC, 30% ETH, 60% DOGE”, prove that this exact composition is received to a specific address).

This task is verified by a ZK proof that is generated using Succinct's library to write ZK proofs in Rust.

# Flow

User sends a fixed amount of tokens to an address on the frontend.

Once the tokens are received the user generates a proof that shows the amount of tokens in the reciever wallet equal the correct predetermined amounts (30 ETH, 60 DOGE, and 10 wBTC).

After the proof is generated the user can verify on chain that the proof is correct. There is also the ability to verify an existing proof if they don't want to wait to generate their own (it takes around 3 minutes).
