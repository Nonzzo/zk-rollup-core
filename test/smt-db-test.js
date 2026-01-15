const { buildPoseidon, buildSMT, SMTMemDb } = require("circomlibjs");

async function testWithDB() {
    console.log("=== Testing buildSMT with explicit SMTMemDb ===\n");
    
    const poseidon = await buildPoseidon();
    const F = poseidon.F;
    
    console.log("Creating SMTMemDb(F)...");
    const db = new SMTMemDb(F);
    console.log("✅ Database created");
    console.log("db keys:", Object.keys(db).slice(0, 10));
    
    console.log("\nTest 1: buildSMT(db, F)");
    try {
        const smt = await buildSMT(db, F);
        console.log("  ✅ buildSMT created");
        console.log("  SMT has hash0:", typeof smt.hash0);
        console.log("  SMT has db:", typeof smt.db);
        console.log("  SMT.db === db:", smt.db === db);
        
        try {
            await smt.update(BigInt(1), BigInt(100));
            console.log("  ✅ update() works!");
            console.log("  Root:", F.toObject(smt.root).toString());
            
            // Try second update
            try {
                await smt.update(BigInt(2), BigInt(50));
                console.log("  ✅ Second update works!");
                console.log("  New root:", F.toObject(smt.root).toString());
                
                // Try getProof
                try {
                    const proof = await smt.getProof(BigInt(1));
                    console.log("  ✅ getProof works!");
                    console.log("  Proof keys:", Object.keys(proof));
                    console.log("  Siblings length:", proof.siblings?.length);
                } catch (e) {
                    console.log("  ❌ getProof failed:", e.message.split('\n')[0]);
                }
            } catch (e) {
                console.log("  ❌ Second update failed:", e.message.split('\n')[0]);
            }
        } catch (e) {
            console.log("  ❌ update() failed:", e.message.split('\n')[0]);
        }
    } catch (e) {
        console.log("  ❌ Error:", e.message);
    }
    
    console.log("\nTest 2: buildSMT(db, poseidon, F)");
    try {
        const db2 = new SMTMemDb(F);
        const smt = await buildSMT(db2, poseidon, F);
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

testWithDB().catch(console.error);