#!/bin/bash
set -e

# 1. Clean previous build
rm -rf build
mkdir -p build

# 2. Compile Circuit
echo "Compiling circuit..."
circom circuits/rollup.circom --r1cs --wasm --sym --output build

# 3. Trusted Setup (Plonk) 
# We use the official Hermez Powers of Tau (Size 14)
# This file is constant, so our ZKey generation will be consistent.
PTAU_FILE="build/powersOfTau28_hez_final_14.ptau"
PTAU_URL="https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_14.ptau

if [ ! -f "$PTAU_FILE" ]; then
    echo "Downloading Official Powers of Tau (Size 14)..."
    wget -O "$PTAU_FILE" "$PTAU_URL"
fi

# 4. Key Generation
echo "Generating Plonk keys..."
# Now we generate the circuit-specific key using the standard base
npx snarkjs plonk setup build/rollup.r1cs "$PTAU_FILE" build/circuit_final.zkey

# 5. Export Verifier
echo "Exporting Solidity Verifier..."
mkdir -p contracts
npx snarkjs zkey export solidityverifier build/circuit_final.zkey contracts/Verifier.sol

echo "✅ ZK Build Complete (Deterministic)."