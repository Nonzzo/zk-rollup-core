const { newMemEmptyTrie } = require("circomlibjs");

async function test() {
    console.log("Creating SMT...");
    const smt = await newMemEmptyTrie();
    
    console.log("✅ SMT created");
    console.log("Initial root:", smt.F.toObject(smt.root).toString());
    
    console.log("\n--- Test 1: Direct hash1 call ---");
    try {
        const h = smt.hash1(BigInt(100), BigInt(999));
        console.log("✅ hash1(100n, 999n) works");
        console.log("   Result:", smt.F.toObject(h).toString());
    } catch (e) {
        console.log("❌ hash1 error:", e.message);
    }
    
    console.log("\n--- Test 2: Update with simple values ---");
    try {
        console.log("Calling: smt.update(1n, 100n)");
        await smt.update(BigInt(1), BigInt(100));
        console.log("✅ Update succeeded!");
        console.log("   New root:", smt.F.toObject(smt.root).toString());
    } catch (e) {
        console.log("❌ Update failed:", e.message);
        // Log more details
        if (e.stack) {
            const lines = e.stack.split('\n').slice(0, 8);
            console.log("   Stack trace:");
            lines.forEach(l => console.log("   ", l));
        }
    }
    
    console.log("\n--- Test 3: Another update ---");
    try {
        console.log("Calling: smt.update(2n, 50n)");
        await smt.update(BigInt(2), BigInt(50));
        console.log("✅ Second update succeeded!");
        console.log("   New root:", smt.F.toObject(smt.root).toString());
    } catch (e) {
        console.log("❌ Second update failed:", e.message);
    }
    
    console.log("\n--- Test 4: Create proof ---");
    try {
        const proof = await smt.createProof(BigInt(1));
        console.log("✅ Proof created!");
        console.log("   Proof keys:", Object.keys(proof));
        console.log("   Siblings count:", proof.siblings?.length);
    } catch (e) {
        console.log("❌ Proof failed:", e.message);
    }
}

test().catch(console.error);