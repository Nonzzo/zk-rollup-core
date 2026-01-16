#!/bin/bash
set -e

# Ensure output directory exists
mkdir -p build

# 1. Compile Circuit (Need circom in PATH)
echo "Compiling circuit..."
circom circuits/rollup.circom --r1cs --wasm --sym --output build

# 2. Trusted Setup (Plonk)
if [ ! -f "build/pot12_final.ptau" ]; then
    echo "Generating dummy Powers of Tau..."
    npx snarkjs powersoftau new bn128 12 build/pot12_0000.ptau -v
    npx snarkjs powersoftau contribute build/pot12_0000.ptau build/pot12_contribution.ptau --name="First Contribution" -v -e="random text"
    npx snarkjs powersoftau prepare phase2 build/pot12_contribution.ptau build/pot12_final.ptau -v
fi

# 3. Key Generation
echo "Generating Plonk keys..."
npx snarkjs plonk setup build/rollup.r1cs build/pot12_final.ptau build/circuit_final.zkey

# 4. Export Verifier for Solidity
# We export to contracts/ folder so Hardhat can find it later
echo "Exporting Solidity Verifier..."
npx snarkjs zkey export solidityverifier build/circuit_final.zkey contracts/Verifier.sol

echo "✅ ZK Build Complete."