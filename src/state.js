const { buildPoseidon } = require("circomlibjs");

// Constants
const TREE_DEPTH = 4; // Depth 4 = 16 leaves (2^4)

class ZkState {
    constructor() {
        this.poseidon = null;
        this.F = null;
        this.leaves = {}; // Index -> Hash
        this.zeros = [];  // Precomputed zero hashes per level
    }

    async initialize() {
        this.poseidon = await buildPoseidon();
        this.F = this.poseidon.F;
        
        // 1. Precompute "Zero Hashes" for empty branches
        // Level 0: Zero (0)
        // Level 1: Hash(0, 0)
        // Level 2: Hash(Hash(0,0), Hash(0,0)) ...
        this.zeros[0] = 0n;
        for (let i = 1; i <= TREE_DEPTH; i++) {
            const prev = this.zeros[i - 1];
            // Hash two previous zero hashes together
            const hash = this.poseidon([prev, prev]);
            this.zeros[i] = this.F.toObject(hash);
        }
        
        console.log(`✅ State: Initialized with Depth ${TREE_DEPTH}`);
    }

    // Helper: Normalize to BigInt
    toBigInt(val) {
        return this.F.toObject(this.F.e(BigInt(val)));
    }

    hashAccount(balance, pubKey) {
        const hash = this.poseidon([BigInt(balance), BigInt(pubKey)]);
        return this.F.toObject(hash);
    }

    // Insert or Update a leaf
    async insertAccount(index, balance, pubKey) {
        const bIndex = BigInt(index);
        
        // Check bounds
        if (bIndex >= BigInt(2 ** TREE_DEPTH)) {
            throw new Error(`Index ${index} out of bounds for depth ${TREE_DEPTH}`);
        }

        const leafHash = this.hashAccount(balance, pubKey);
        this.leaves[bIndex.toString()] = leafHash;

        return {
            index,
            balance,
            pubKey,
            leafHash: leafHash.toString()
        };
    }

    // Calculate Root (On-the-fly)
    async getRoot() {
        // In a real optimized tree, we wouldn't recompute everything.
        // For this project, recomputing is safer to avoid state drift bugs.
        let nodes = {};
        
        // 1. Fill Level 0 with current leaves or zeros
        for (let i = 0; i < 2 ** TREE_DEPTH; i++) {
            nodes[i] = this.leaves[i.toString()] || this.zeros[0];
        }

        // 2. Hash up the levels
        for (let level = 0; level < TREE_DEPTH; level++) {
            const nextLevelNodes = {};
            const count = 2 ** (TREE_DEPTH - level);
            
            for (let i = 0; i < count; i += 2) {
                const left = nodes[i];
                const right = nodes[i + 1];
                const hash = this.poseidon([left, right]);
                nextLevelNodes[i / 2] = this.F.toObject(hash);
            }
            nodes = nextLevelNodes;
        }

        // The last remaining node is root
        return nodes[0].toString();
    }

    // Generate Merkle Path for Circom
    async generateProof(index) {
        const bIndex = BigInt(index);
        const pathElements = [];
        const pathIndices = []; // 0 = left, 1 = right

        // We need to reconstruct the tree state to find siblings
        // (Identical logic to getRoot, but capturing the path)
        let nodes = {};
        
        // Init Level 0
        for (let i = 0; i < 2 ** TREE_DEPTH; i++) {
            nodes[i] = this.leaves[i.toString()] || this.zeros[0];
        }

        let currentIndex = Number(bIndex);

        for (let level = 0; level < TREE_DEPTH; level++) {
            // Is our node on the left (even) or right (odd)?
            const isRight = currentIndex % 2 === 1;
            const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;
            
            // Push the sibling hash
            pathElements.push(nodes[siblingIndex].toString());
            // Push direction (0 or 1)
            pathIndices.push(isRight ? 1 : 0);

            // Move to next level
            const nextLevelNodes = {};
            const count = 2 ** (TREE_DEPTH - level);
            for (let i = 0; i < count; i += 2) {
                const left = nodes[i];
                const right = nodes[i + 1];
                const hash = this.poseidon([left, right]);
                nextLevelNodes[i / 2] = this.F.toObject(hash);
            }
            nodes = nextLevelNodes;
            currentIndex = Math.floor(currentIndex / 2);
        }

        const leafHash = this.leaves[bIndex.toString()] || this.zeros[0].toString();

        return {
            pathElements, // The hashes we need
            pathIndices,  // The path directions (needed for circuit)
            leafHash
        };
    }
}

module.exports = ZkState;