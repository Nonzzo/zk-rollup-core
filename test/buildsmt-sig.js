const { buildPoseidon, buildSMT, SMTMemDb, newMemEmptyTrie } = require("circomlibjs");

async function test() {
    console.log("=== Finding the correct buildSMT signature ===\n");
    
    const poseidon = await buildPoseidon();
    const F = poseidon.F;
    const db = new SMTMemDb(F);
    
    // First, let's see what newMemEmptyTrie returns and how it works
    console.log("Test 1: Understanding newMemEmptyTrie");
    try {
        const tree = await newMemEmptyTrie();
        console.log("  ✅ Created");
        console.log("  Has hash0:", typeof tree.hash0);
        console.log("  Has hash1:", typeof tree.hash1);
        console.log("  Has F:", typeof tree.F);
        console.log("  Has db:", typeof tree.db);
        
        // Try updating it
        try {
            await tree.update(BigInt(1), BigInt(100));
            console.log("  ✅ update() works!");
            console.log("  Root:", F.toObject(tree.root).toString());
        } catch (e) {
            console.log("  ❌ update() failed:", e.message.split('\n')[0]);
        }
    } catch (e) {
        console.log("  ❌ Error:", e.message);
    }
    
    // Now try different buildSMT parameter combinations
    console.log("\nTest 2: buildSMT parameter combinations");
    
    const tests = [
        { name: "buildSMT(db)", params: [db] },
        { name: "buildSMT(db, poseidon)", params: [db, poseidon] },
        { name: "buildSMT(poseidon)", params: [poseidon] },
        { name: "buildSMT(poseidon, F)", params: [poseidon, F] },
        { name: "buildSMT(poseidon, db)", params: [poseidon, db] },
    ];
    
    for (const test of tests) {
        console.log(`\n  ${test.name}:`);
        try {
            const smt = await buildSMT(...test.params);
            console.log("    Constructor: ✅");
            console.log("    Has hash0:", typeof smt.hash0);
            console.log("    Has hash1:", typeof smt.hash1);
            
            try {
                await smt.update(BigInt(1), BigInt(100));
                console.log("    update(): ✅ WORKS!");
            } catch (e) {
                console.log("    update(): ❌", e.message.split('\n')[0].substring(0, 50));
            }
        } catch (e) {
            console.log("    Constructor: ❌", e.message.split('\n')[0].substring(0, 50));
        }
    }
}

test().catch(console.error);