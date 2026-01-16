#!/bin/bash
set -e

# Ensure output directory exists
mkdir -p build

# 1. Compile Circuit
echo "Compiling circuit..."
circom circuits/rollup.circom --r1cs --wasm --sym --output build

# 2. Trusted Setup (Plonk)
if [ ! -f "build/pot14_final.ptau" ]; then
    echo "Generating dummy Powers of Tau (Size 14)..."
    npx snarkjs powersoftau new bn128 14 build/pot14_0000.ptau -v
    npx snarkjs powersoftau contribute build/pot14_0000.ptau build/pot14_contribution.ptau --name="First Contribution" -v -e="random text"
    npx snarkjs powersoftau prepare phase2 build/pot14_contribution.ptau build/pot14_final.ptau -v
fi

# 3. Key Generation
echo "Generating Plonk keys..."
npx snarkjs plonk setup build/rollup.r1cs build/pot14_final.ptau build/circuit_final.zkey
# ------------------------------------------

# 4. Export Verifier for Solidity
echo "Exporting Solidity Verifier..."
npx snarkjs zkey export solidityverifier build/circuit_final.zkey contracts/Verifier.sol

echo "✅ ZK Build Complete."