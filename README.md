# zk-rollup-core: Layer 2 Scaling Solution


![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)
![Network](https://img.shields.io/badge/network-Sepolia-grey.svg)
![Tech](https://img.shields.io/badge/ZK-Plonk%20%2B%20Circom-purple.svg)

A full-stack, bi-directional Zero-Knowledge Rollup deployed on the **Ethereum Sepolia Testnet**. This protocol scales Ethereum by batching off-chain transactions, generating a **Plonk ZK-SNARK** proof, and verifying the state transition on-chain.

It features a complete **CI/CD pipeline**, **Kubernetes (AKS)** deployment, and a **Deterministic Build System** for cryptographic artifacts.

---

## 🚀 Key Features

*   **⚡ Instant L2 Transfers:** Process transactions off-chain with immediate confirmation.
*   **🌉 Bi-Directional Bridge:**
    *   **Inbound:** Detects `Deposit` events on L1 and auto-credits L2 accounts.
    *   **Outbound:** Securely processes withdrawals back to Ethereum.
*   **🛡️ Censorship Resistance:** Implements "Forced Withdrawals" at the smart contract level, ensuring users can exit even if the Sequencer goes offline.
*   **🔍 Live Block Explorer:** Real-time visibility into L2 blocks, transaction status, and ZK verification.
*   **🔐 ZK-SNARKs (PLONK):** Uses `circom` and `snarkjs` with a universal trusted setup (Hermez Powers of Tau).

---

## 🏗️ Architecture

The system consists of four primary components:

1.  **The Circuits (The Core):**
    *   Written in `Circom`.
    *   Proves inclusion of a transaction sender in the Merkle Tree.
    *   Verifies State Root transitions.
2.  **The L2 Node (The Brain):**
    *   **API:** Node.js/Express server handling client requests.
    *   **State Manager:** Manages a Sparse Merkle Tree (SMT) backed by PostgreSQL.
    *   **Sequencer:** Batches transactions and submits proofs to Sepolia.
3.  **The Prover (The Muscle):**
    *   Generates cryptographic proofs (PLONK) using `snarkjs`.
    *   Runs inside a deterministic Docker container.
4.  **The Infrastructure (The Cloud):**
    *   Deployed on **Azure Kubernetes Service (AKS)** via Terraform.
    *   Automated CI/CD via GitHub Actions.

---

## 🛠️ Tech Stack

| Category | Technology | Usage |
| :--- | :--- | :--- |
| **Blockchain** | Solidity, Hardhat, Ethers.js | L1 Smart Contracts & Integration |
| **Cryptography** | Circom, SnarkJS | ZK Circuits & Proof Generation |
| **Backend** | Node.js, Express | API & Sequencer Logic |
| **Database** | PostgreSQL | Off-chain State & Mempool |
| **Frontend** | Next.js, TailwindCSS | User Dashboard & Explorer |
| **DevOps** | Docker, Kubernetes (AKS) | Containerization & Orchestration |
| **IaC** | Terraform | Infrastructure Provisioning |

---

## 🏁 Getting Started

### Prerequisites
*   Node.js v18+
*   Docker & Docker Compose
*   A Sepolia Wallet Private Key & RPC URL

### 1. Installation
```bash
git clone https://github.com/yourusername/zk-rollup.git
cd zk-rollup
npm install
cd frontend && npm install
```

### 2. Local Simulation (Off-Chain Only)
Test the Merkle Tree and Circuit logic without touching the blockchain.
```bash
node test/local-simulation.js
```

### 3. Run the Full Stack Locally
Spin up the Database, Backend, and Frontend.

*Note: Create a `.env` file in root with `SEPOLIA_RPC_URL` and `PRIVATE_KEY` first.*

```bash
# 1. Start Postgres
docker-compose up -d postgres

# 2. Start Backend
node src/api.js

# 3. Start Frontend (in new terminal)
cd frontend && npm run dev
```
Visit `http://localhost:3000` to interact with the Rollup.

---

## ☁️ Deployment (DevOps)

This project uses a "GitOps" approach. Pushing to `main` triggers the pipeline.

### Infrastructure (Terraform)
Provision the Azure AKS cluster.
```bash
cd terraform
terraform init
terraform apply
```

### CI/CD Pipeline (GitHub Actions)
The `.github/workflows/deploy.yml` pipeline handles:
1.  **Multi-Stage Docker Build:**
    *   Downloads official Powers of Tau (PTAU 14).
    *   Compiles Circuits (`.r1cs`, `.wasm`).
    *   Generates ZKeys deterministically.
    *   Compiles Solidity Contracts using the *generated* Verifier.
2.  **Push:** Pushes optimized images to Docker Hub.
3.  **Deploy:** Updates Kubernetes manifests and restarts pods.

### Manual K8s Deployment
If you need to deploy the contracts manually via Kubernetes Job:
```bash
kubectl apply -f k8s-scripts/job-deploy.yaml
```

---

## 🔐 Cryptography Deep Dive

### Deterministic Builds
A major challenge in ZK development is ensuring the **Prover** (Off-chain) and **Verifier** (On-chain) use the exact same cryptographic parameters.
*   I solved this by compiling circuits **inside** the Docker build process.
*   I use the **Polygon Hermez Powers of Tau (Size 14)** to ensure a standardized, secure trusted setup base.

### State Management
*   **Tree Depth:** 4 (Optimized for demo speed, supports 16 accounts).
*   **Hashing:** Poseidon Hash (ZK-friendly).
*   **Proof System:** PLONK (Allows Universal Setup, faster verification).

---



## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.