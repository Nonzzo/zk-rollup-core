#!/bin/bash
set -e

# 1. Clean previous build
rm -rf build
mkdir -p build

# 2. Compile Circuit
echo "Compiling circuit..."
circom circuits/rollup.circom --r1cs --wasm --sym --output build

# 3. Download Official Perpetual Powers of Tau
PTAU_SIZE=14
PTAU_FILE="build/pot${PTAU_SIZE}_final.ptau"
PTAU_URL="https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_${PTAU_SIZE}.ptau"

if [ ! -f "$PTAU_FILE" ]; then
    echo "📥 Downloading official Powers of Tau (Size ${PTAU_SIZE})..."
    echo "   This is from the Hermez/Polygon zkEVM ceremony"
    echo "   Source: ${PTAU_URL}"
    
    # Download the official ceremony file
    wget -O "$PTAU_FILE" "$PTAU_URL" || curl -o "$PTAU_FILE" "$PTAU_URL"
    
    # Verify file was downloaded
    if [ ! -f "$PTAU_FILE" ]; then
        echo "❌ Failed to download Powers of Tau file"
        exit 1
    fi
    
    echo "✅ Downloaded official ceremony (deterministic)"
else
    echo "♻️  Using cached Powers of Tau file"
fi

# 4. Verify the ptau file
EXPECTED_SIZE=$((2**PTAU_SIZE * 96 + 1000))  # Approximate expected size
ACTUAL_SIZE=$(wc -c < "$PTAU_FILE")

if [ "$ACTUAL_SIZE" -lt "$EXPECTED_SIZE" ]; then
    echo "⚠️  Warning: Powers of Tau file seems too small ($ACTUAL_SIZE bytes)"
    echo "   Expected at least $EXPECTED_SIZE bytes"
    echo "   This might cause issues. Consider re-downloading."
fi

# 5. Key Generation (Deterministic - same .ptau always gives same .zkey)
echo "Generating Plonk keys using $PTAU_FILE..."
npx snarkjs plonk setup build/rollup.r1cs "$PTAU_FILE" build/circuit_final.zkey

# 6. Export Verifier (This will always be the same given the same .zkey)
echo "Exporting Solidity Verifier..."
mkdir -p contracts
npx snarkjs zkey export solidityverifier build/circuit_final.zkey contracts/Verifier.sol

# 7. Verification checksums (for debugging)
echo ""
echo "✅ ZK Build Complete (Deterministic)"
echo "📊 Build Artifacts Checksums:"
echo "   Verifier.sol: $(sha256sum contracts/Verifier.sol | cut -d' ' -f1 | head -c 16)..."
echo "   circuit_final.zkey: $(sha256sum build/circuit_final.zkey | cut -d' ' -f1 | head -c 16)..."
echo "   rollup.wasm: $(sha256sum build/rollup_js/rollup.wasm | cut -d' ' -f1 | head -c 16)..."
echo ""
echo "ℹ️  These checksums should be IDENTICAL on all machines/builds"