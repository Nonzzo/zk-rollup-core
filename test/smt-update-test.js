const { buildPoseidon, SMT, SMTMemDb } = require("circomlibjs");

async function testUpdate() {
    console.log("Building Poseidon...");
    const poseidon = await buildPoseidon();
    const F = poseidon.F;
    
    console.log("Creating SMTMemDb...");
    const db = new SMTMemDb(F);
    
    console.log("\n=== Testing different SMT constructor + update combos ===\n");
    
    // Test 1: SMT(db, poseidon, F)
    console.log("Test 1: new SMT(db, poseidon, F)");
    try {
        const smt1 = new SMT(db, poseidon, F);
        console.log("  Constructor: ✅");
        
        try {
            await smt1.update(BigInt(1), BigInt(100));
            console.log("  update(): ✅");
            console.log("  Root:", F.toObject(smt1.root).toString());
        } catch (e) {
            console.log("  update(): ❌", e.message.split('\n')[0]);
        }
    } catch (e) {
        console.log("  Constructor: ❌", e.message);
    }
    
    // Test 2: SMT(db, poseidon) - without F
    console.log("\nTest 2: new SMT(db, poseidon)");
    try {
        const smt2 = new SMT(db, poseidon);
        console.log("  Constructor: ✅");
        
        try {
            await smt2.update(BigInt(1), BigInt(100));
            console.log("  update(): ✅");
            console.log("  Root:", F.toObject(smt2.root).toString());
        } catch (e) {
            console.log("  update(): ❌", e.message.split('\n')[0]);
        }
    } catch (e) {
        console.log("  Constructor: ❌", e.message);
    }
    
    // Test 3: Try with a fresh db each time
    console.log("\nTest 3: Fresh db for each test");
    try {
        const db3 = new SMTMemDb(F);
        const smt3 = new SMT(db3, poseidon);
        console.log("  Constructor: ✅");
        
        console.log("  Attempting update with different value types...");
        
        // Try with explicit F conversion
        try {
            const key = F.e(BigInt(1));
            const value = F.e(BigInt(100));
            await smt3.update(key, value);
            console.log("  update(F.e(), F.e()): ✅");
        } catch (e) {
            console.log("  update(F.e(), F.e()): ❌", e.message.split('\n')[0]);
        }
        
        // Try with BigInt
        try {
            const db3b = new SMTMemDb(F);
            const smt3b = new SMT(db3b, poseidon);
            await smt3b.update(BigInt(1), BigInt(100));
            console.log("  update(BigInt, BigInt): ✅");
            console.log("  Root:", F.toObject(smt3b.root).toString());
        } catch (e) {
            console.log("  update(BigInt, BigInt): ❌", e.message.split('\n')[0]);
        }
    } catch (e) {
        console.log("  Error:", e.message);
    }
}

testUpdate().catch(console.error);