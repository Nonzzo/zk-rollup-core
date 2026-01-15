const snarkjs = require("snarkjs");
const path = require("path");
const fs = require("fs");

// Paths to the artifacts generated in Phase 2
const WASM_PATH = path.join(__dirname, "../build/rollup_js/rollup.wasm");
const ZKEY_PATH = path.join(__dirname, "../build/circuit_final.zkey");

async function generateProof(circuitInput) {
    try {
        console.log("🔐 Prover: Starting ZK Proof Generation...");
        const startTime = Date.now();

        // snarkjs.plonk.fullProve(input, wasmFile, zkeyFile)
        const { proof, publicSignals } = await snarkjs.plonk.fullProve(
            circuitInput,
            WASM_PATH,
            ZKEY_PATH
        );

        const endTime = Date.now();
        console.log(`✅ Prover: Proof generated in ${endTime - startTime}ms`);

        return { proof, publicSignals };
    } catch (error) {
        console.error("❌ Prover Error:", error);
        throw error;
    }
}

module.exports = { generateProof };