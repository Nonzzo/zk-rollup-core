# zk-rollup-core

This project implements a basic Zero-Knowledge Rollup (ZK-Rollup). It consists of:

*   **Smart Contracts:** Deployed on Layer 1 (Sepolia testnet) for handling deposits, withdrawals, and verifying ZK proofs.
*   **Layer 2 (L2) Node:** An off-chain backend that processes transactions, manages the L2 state (account balances, Merkle tree), generates ZK proofs for batches of transactions, and submits them to the L1 rollup contract.
*   **Frontend Application:** A user interface for interacting with the ZK-Rollup, enabling deposits, transfers, and withdrawals.
*   **Proof Generation:** Utilizes Circom and SnarkJS for compiling ZK circuits and generating cryptographic proofs.
*   **Database:** PostgreSQL is used for persistent storage of the L2 state.