const { newMemEmptyTrie } = require("circomlibjs");

async function test() {
    console.log("=== Testing SMT with different value types ===\n");
    
    const smt = await newMemEmptyTrie();
    const F = smt.F;
    
    console.log("SMT created. Testing update() with different value types:\n");
    
    const testCases = [
        { name: "BigInt, BigInt", key: BigInt(1), value: BigInt(100) },
        { name: "F.e(BigInt), F.e(BigInt)", key: F.e(BigInt(1)), value: F.e(BigInt(100)) },
        { name: "F.e(number), F.e(number)", key: F.e(1), value: F.e(100) },
        { name: "number, number", key: 1, value: 100 },
        { name: "0n, 100n", key: 0n, value: 100n },
    ];
    
    for (const tc of testCases) {
        console.log(`Test: ${tc.name}`);
        console.log(`  key type: ${typeof tc.key}, value type: ${typeof tc.value}`);
        try {
            const smt2 = await newMemEmptyTrie();
            await smt2.update(tc.key, tc.value);
            console.log(`  ✅ Works! Root: ${F.toObject(smt2.root).toString()}`);
            break; // If one works, we found it
        } catch (e) {
            const msg = e.message.split('\n')[0];
            console.log(`  ❌ ${msg.substring(0, 60)}`);
        }
    }
    
    // Also test if we should use the smt.F instead of poseidon.F
    console.log("\n=== Compare Field instances ===");
    const { buildPoseidon } = require("circomlibjs");
    const poseidon = await buildPoseidon();
    console.log("smt.F === poseidon.F:", smt.F === poseidon.F);
    console.log("smt.F.p === poseidon.F.p:", smt.F.p === poseidon.F.p);
}

test().catch(console.error);