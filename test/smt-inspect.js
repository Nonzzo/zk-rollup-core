const { buildPoseidon, buildPoseidonOpt, SMT, SMTMemDb } = require("circomlibjs");

async function inspect() {
    console.log("=== Inspecting Poseidon Object ===\n");
    
    const poseidon = await buildPoseidon();
    
    console.log("Poseidon keys:", Object.keys(poseidon));
    console.log("F type:", typeof poseidon.F);
    console.log("F keys:", poseidon.F ? Object.keys(poseidon.F).slice(0, 20) : "N/A");
    
    console.log("\n=== Checking for hash functions ===");
    console.log("poseidon.hash0:", typeof poseidon.hash0);
    console.log("poseidon.hash1:", typeof poseidon.hash1);
    console.log("poseidon() callable:", typeof poseidon === 'function');
    
    console.log("\n=== Testing poseidon() as function ===");
    try {
        const result = poseidon([BigInt(1), BigInt(2)]);
        console.log("✅ poseidon([1n, 2n]) works");
        console.log("   Result type:", result?.constructor?.name);
        const asBI = poseidon.F.toObject(result);
        console.log("   As BigInt:", asBI.toString());
    } catch (e) {
        console.log("❌ Error:", e.message);
    }
    
    console.log("\n=== Checking SMT constructor signature ===");
    const db = new SMTMemDb(poseidon.F);
    console.log("SMTMemDb created");
    
    console.log("\nTrying different SMT constructor signatures...");
    
    // Try 1: (db, hash0, hash1, F)
    console.log("\n1. new SMT(db, hash0, hash1, F)");
    try {
        const smt1 = new SMT(db, poseidon.hash0, poseidon.hash1, poseidon.F);
        console.log("   ✅ Works!");
    } catch (e) {
        console.log("   ❌", e.message);
    }
    
    // Try 2: (db, poseidon, poseidon.F)
    console.log("\n2. new SMT(db, poseidon, F)");
    try {
        const smt2 = new SMT(db, poseidon, poseidon.F);
        console.log("   ✅ Works!");
    } catch (e) {
        console.log("   ❌", e.message);
    }
    
    // Try 3: (db, hash function)
    console.log("\n3. new SMT(db, poseidon)");
    try {
        const smt3 = new SMT(db, poseidon);
        console.log("   ✅ Works!");
    } catch (e) {
        console.log("   ❌", e.message);
    }
    
    // Try 4: (poseidon, F)
    console.log("\n4. new SMT(poseidon, F)");
    try {
        const smt4 = new SMT(poseidon, poseidon.F);
        console.log("   ✅ Works!");
    } catch (e) {
        console.log("   ❌", e.message);
    }
}

inspect().catch(console.error);