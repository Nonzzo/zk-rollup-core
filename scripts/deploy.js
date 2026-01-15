const { ethers } = require("hardhat");
const stateManager = require("../src/state-manager");

async function main() {
  console.log("🚀 Starting Deployment to Sepolia...");

  // 1. Initialize State to get the initial root
  // The contract needs to know what the empty tree looks like
  await stateManager.initialize();
  const initialRoot = await stateManager.zkState.getRoot();
  console.log(`🌳 Initial State Root: ${initialRoot}`);

  // 2. Deploy Verifier
  console.log("Deploying PlonkVerifier...");
  const Verifier = await ethers.getContractFactory("PlonkVerifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddr = await verifier.getAddress();
  console.log(`✅ Verifier deployed to: ${verifierAddr}`);

  // 3. Deploy Rollup
  console.log("Deploying ZkRollup...");
  const Rollup = await ethers.getContractFactory("ZkRollup");
  const rollup = await Rollup.deploy(verifierAddr, initialRoot);
  await rollup.waitForDeployment();
  console.log(`✅ ZkRollup deployed to: ${await rollup.getAddress()}`);

  console.log("\n--- Deployment Info ---");
  console.log("VERIFIER_ADDRESS=" + verifierAddr);
  console.log("ROLLUP_ADDRESS=" + await rollup.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});