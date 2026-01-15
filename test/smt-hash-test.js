const { buildPoseidon, buildSMT, SMTMemDb } = require("circomlibjs");

async function testWithBuildSMT() {
    console.log("=== Trying buildSMT (factory function) ===\n");
    
    const poseidon = await buildPoseidon();
    const F = poseidon.F;
    
    console.log("Test 1: buildSMT(poseidon.F)");
    try {
        const smt = await buildSMT(F);
        console.log("  ✅ buildSMT created");
        console.log("  SMT keys:", Object.keys(smt).slice(0, 10));
        
        try {
            await smt.update(BigInt(1), BigInt(100));
            console.log("  ✅ update() works!");
            console.log("  Root:", F.toObject(smt.root).toString());
        } catch (e) {
            console.log("  ❌ update() failed:", e.message.split('\n')[0]);
        }
    } catch (e) {
        console.log("  ❌ Error:", e.message);
    }
    
    console.log("\nTest 2: buildSMT(poseidon, F)");
    try {
        const smt = await buildSMT(poseidon, F);
        console.log("  ✅ buildSMT created");
        
        try {
            await smt.update(BigInt(1), BigInt(100));
            console.log("  ✅ update() works!");
            console.log("  Root:", F.toObject(smt.root).toString());
        } catch (e) {
            console.log("  ❌ update() failed:", e.message.split('\n')[0]);
        }
    } catch (e) {
        console.log("  ❌ Error:", e.message);
    }
    
    console.log("\nTest 3: buildSMT(F, poseidon)");
    try {
        const smt = await buildSMT(F, poseidon);
        console.log("  ✅ buildSMT created");
        
        try {
            await smt.update(BigInt(1), BigInt(100));
            console.log("  ✅ update() works!");
            console.log("  Root:", F.toObject(smt.root).toString());
        } catch (e) {
            console.log("  ❌ update() failed:", e.message.split('\n')[0]);
        }
    } catch (e) {
        console.log("  ❌ Error:", e.message);
    }
}

testWithBuildSMT().catch(console.error);