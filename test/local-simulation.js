const ZkState = require("../src/state");
const fs = require("fs");
const path = require("path");

async function run() {
    console.log("🚀 Starting Phase 1 (Revised): Fixed-Depth Merkle Tree");

    const state = new ZkState();
    await state.initialize();

    // 1. Insert Account A at Index 0
    console.log("\n--- Inserting Account A (Index 0) ---");
    const accA = await state.insertAccount(0, 100, 999);
    
    // 2. Insert Account B at Index 1
    console.log("\n--- Inserting Account B (Index 1) ---");
    const accB = await state.insertAccount(1, 50, 888);
    
    // 3. Generate Proof for A
    console.log("\n--- Generating Proof for Account A ---");
    const proof = await state.generateProof(0);
    const currentRoot = await state.getRoot();

    console.log(`Expected Root: ${currentRoot}`);
    
    // --- CRITICAL FIX: Separate Circuit Input from Debug Data ---
    
    // 1. The Input for SnarkJS (MUST NOT contain output signals like 'root')
    const circuitInput = {
        leaf: accA.leafHash,
        pathElements: proof.pathElements,
        pathIndices: proof.pathIndices
    };

    // 2. Save automatically to input.json (So you don't have to copy-paste)
    const inputPath = path.join(__dirname, "../input.json");
    fs.writeFileSync(inputPath, JSON.stringify(circuitInput, null, 2));
    console.log(`\n✅ Saved Clean Input to: ${inputPath}`);
    console.log(JSON.stringify(circuitInput, null, 2));

    // CHECK: Depth must be exactly 4
    if (proof.pathElements.length !== 4) {
        throw new Error("❌ Error: Proof depth must be 4 for the circuit!");
    }
}

run().catch(console.error);