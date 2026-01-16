#!/bin/bash
set -e

# 1. Clean previous build (Crucial for Docker cache)
rm -rf build
mkdir -p build

# 2. Compile Circuit
echo "Compiling circuit..."
circom circuits/rollup.circom --r1cs --wasm --sym --output build

# 3. Trusted Setup (Plonk)
# Define the target size and filename using variables
PTAU_SIZE=14
PTAU_FILE="build/pot${PTAU_SIZE}_final.ptau"

if [ ! -f "$PTAU_FILE" ]; then
    echo "Generating dummy Powers of Tau (Size ${PTAU_SIZE})..."
    npx snarkjs powersoftau new bn128 "$PTAU_SIZE" build/pot_temp.ptau -v
    npx snarkjs powersoftau contribute build/pot_temp.ptau build/pot_contribution.ptau --name="First Contribution" -v -e="random text"
    npx snarkjs powersoftau prepare phase2 build/pot_contribution.ptau "$PTAU_FILE" -v
    rm build/pot_temp.ptau build/pot_contribution.ptau
fi

# 4. Key Generation
echo "Generating Plonk keys using $PTAU_FILE..."
npx snarkjs plonk setup build/rollup.r1cs "$PTAU_FILE" build/circuit_final.zkey

# 5. Export Verifier
echo "Exporting Solidity Verifier..."
mkdir -p contracts
npx snarkjs zkey export solidityverifier build/circuit_final.zkey contracts/Verifier.sol

echo "✅ ZK Build Complete."

# 3. Key Generation
echo "Generating Plonk keys..."
npx snarkjs plonk setup build/rollup.r1cs build/pot14_final.ptau build/circuit_final.zkey
# ------------------------------------------

# 4. Export Verifier for Solidity
echo "Exporting Solidity Verifier..."
npx snarkjs zkey export solidityverifier build/circuit_final.zkey contracts/Verifier.sol

echo "✅ ZK Build Complete."