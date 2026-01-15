pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/mux1.circom";

// MerkleVerifier: Proves that a 'leaf' exists in a tree at a specific 'root'
// given the 'pathElements' and 'pathIndices'.
template MerkleVerifier(levels) {
    signal input leaf;
    signal input pathElements[levels];
    signal input pathIndices[levels]; // 0 for left, 1 for right
    signal output root;

    component poseidons[levels];
    component mux[levels];

    signal currentHash[levels + 1];
    currentHash[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        // --- Selector Logic ---
        // We need to order the two inputs (current vs sibling) based on pathIndices[i].
        // If index is 0: inputs are [current, sibling]
        // If index is 1: inputs are [sibling, current]
        
        mux[i] = MultiMux1(2);
        mux[i].c[0][0] <== currentHash[i];
        mux[i].c[0][1] <== pathElements[i];
        
        mux[i].c[1][0] <== pathElements[i];
        mux[i].c[1][1] <== currentHash[i];

        mux[i].s <== pathIndices[i];

        // --- Hashing Logic ---
        poseidons[i] = Poseidon(2);
        poseidons[i].inputs[0] <== mux[i].out[0];
        poseidons[i].inputs[1] <== mux[i].out[1];

        currentHash[i + 1] <== poseidons[i].out;
    }

    root <== currentHash[levels];
}