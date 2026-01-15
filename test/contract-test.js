const { expect } = require("chai");
const { ethers } = require("hardhat");
const stateManager = require("../src/state-manager");
const prover = require("../src/prover");
const snarkjs = require("snarkjs");

describe("ZkRollup On-Chain Integration", function () {
  let rollup, verifier;
  let initialRoot;

  before(async function () {
    // 1. Initialize State
    await stateManager.initialize();
    initialRoot = await stateManager.zkState.getRoot();

    // 2. Deploy Verifier
    const Verifier = await ethers.getContractFactory("PlonkVerifier");
    verifier = await Verifier.deploy();
    await verifier.waitForDeployment();
    console.log("Verifier deployed to:", await verifier.getAddress());

    // 3. Deploy Rollup
    const Rollup = await ethers.getContractFactory("ZkRollup");
    rollup = await Rollup.deploy(await verifier.getAddress(), initialRoot);
    await rollup.waitForDeployment();
    console.log("Rollup deployed to:", await rollup.getAddress());
  });

  it("Should verify a valid proof from the off-chain node", async function () {
    // 1. Generate Proof (Simulating off-chain worker)
    console.log("Generating off-chain proof...");
    const proofData = await stateManager.zkState.generateProof(0);
    const circuitInput = {
        leaf: proofData.leafHash,
        pathElements: proofData.pathElements,
        pathIndices: proofData.pathIndices
    };

    const { proof, publicSignals } = await prover.generateProof(circuitInput);
    
    // 2. Convert to Solidity Calldata
    const rawCallData = await snarkjs.plonk.exportSolidityCallData(proof, publicSignals);
    
    // LOGGING: See exactly what snarkjs returns
    console.log("Raw CallData from SnarkJS:", rawCallData.substring(0, 50) + "...");

    // ROBUST PARSING STRATEGY
    // rawCallData is usually: ["0x...", ...], ["0x..."]
    // We split by the first closing bracket "]" to separate the proof array from the input array.
    
    const splitIndex = rawCallData.indexOf("]");
    if (splitIndex === -1) {
        throw new Error("Could not parse calldata: No closing bracket found");
    }

    // Part 1: The Proof Array (Everything up to the first ']')
    const proofString = rawCallData.substring(0, splitIndex + 1);
    
    // Part 2: The Public Signals (Everything after). 
    // We strip the leading comma/whitespace if present.
    let pubSignalsString = rawCallData.substring(splitIndex + 1).trim();
    if (pubSignalsString.startsWith(",")) {
        pubSignalsString = pubSignalsString.substring(1).trim();
    }

    // Parse them individually
    const proofArray = JSON.parse(proofString);
    const pubSignalsArray = JSON.parse(pubSignalsString);

    console.log("Parsed Proof Length:", proofArray.length);
    console.log("Parsed Root:", pubSignalsArray[0]);

    // 3. Submit to Smart Contract
    const tx = await rollup.submitBatch(pubSignalsArray[0], proofArray);
    await tx.wait();

    // 4. Verify On-Chain State Updated
    const newOnChainRoot = await rollup.stateRoot();
    
    const expectedRootDecimal = BigInt(pubSignalsArray[0]).toString();
    
    expect(newOnChainRoot.toString()).to.equal(expectedRootDecimal);
    console.log("✅ Proof Verified On-Chain! State Root Updated.");
  });
});