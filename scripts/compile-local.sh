#!/bin/bash
set -e

# 1. Compilation
echo "Compiling circuit..."
mkdir -p build
circom circuits/rollup.circom --r1cs --wasm --sym --output build

# 2. Trusted Setup (Plonk)
# We generate a fresh, insecure Powers of Tau for local dev.
# IMPORTANT: In production, use a pre-computed generic .ptau file.
if [ ! -f "build/pot12_final.ptau" ]; then
    echo "Generating dummy Powers of Tau..."
    # Create new
    snarkjs powersoftau new bn128 12 build/pot12_0000.ptau -v
    # Contribute (randomness)
    snarkjs powersoftau contribute build/pot12_0000.ptau build/pot12_contribution.ptau --name="First Contribution" -v -e="random text"
    
    # --- FIXED STEP ---
    # Prepare Phase 2 (Calculate Lagrange Polynomials)
    # This is required even for Plonk when using a fresh Ptau.
    echo "Preparing Phase 2..."
    snarkjs powersoftau prepare phase2 build/pot12_contribution.ptau build/pot12_final.ptau -v
    # ------------------
fi

# 3. Key Generation
echo "Generating Plonk keys..."
snarkjs plonk setup build/rollup.r1cs build/pot12_final.ptau build/circuit_final.zkey

echo "Exporting Verification Key..."
snarkjs zkey export verificationkey build/circuit_final.zkey build/verification_key.json

# 4. Proof Generation
echo "Generating Proof..."
# Calculate witness (JS)
node build/rollup_js/generate_witness.js build/rollup_js/rollup.wasm input.json build/witness.wtns

# Generate ZK Proof
snarkjs plonk prove build/circuit_final.zkey build/witness.wtns build/proof.json build/public.json

# 5. Verification
echo "Verifying Proof..."
snarkjs plonk verify build/verification_key.json build/public.json build/proof.json

echo "✅ SUCCESS: Circuit matches JS State!"