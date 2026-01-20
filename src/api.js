if (process.env.NODE_ENV !== 'production') {
    try {
        require('dotenv').config();
    } catch (e) {
        // Ignore if dotenv is missing in production
        console.log("Not using dotenv");
    }
}
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const stateManager = require('./state-manager');
const prover = require('./prover');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const snarkjs = require("snarkjs");
const { ethers } = require("ethers");

// --- CONFIGURATION ---
const ROLLUP_ADDRESS = process.env.ROLLUP_ADDRESS; 
const RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
// Database URL might come from K8s env or local .env
const DATABASE_URL = process.env.DATABASE_URL || "postgres://admin:password@localhost:5432/zkrollup";

// Load ABI from Hardhat Artifacts
const ARTIFACT_PATH = path.join(__dirname, "../artifacts/contracts/Rollup.sol/ZkRollup.json");
const ROLLUP_ABI = JSON.parse(fs.readFileSync(ARTIFACT_PATH)).abi;

// Fail Fast: Check required variables
if (!ROLLUP_ADDRESS || !RPC_URL || !PRIVATE_KEY) {
    console.error("❌ Missing required environment variables (ROLLUP_ADDRESS, SEPOLIA_RPC_URL, or PRIVATE_KEY).");
    process.exit(1);
}


const app = express();
// Add CORS to allow frontend to talk to backend
app.use(cors());
app.use(bodyParser.json());

const pool = new Pool({ connectionString: DATABASE_URL });

async function migrate() {
    try {
        console.log("🛠️ Checking DB Schema...");
        const client = await pool.connect();
        try {
            // 1. Add 'proof' column if missing
            await client.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS proof TEXT;`);
            
            // 2. Add 'type' column (For Deposits/Withdrawals)
            await client.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'TRANSFER';`);
            
            // 3. Add 'to_address' column (For Withdrawals)
            await client.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS to_address TEXT;`);
            
            console.log("✅ DB Schema verified/updated.");
        } finally {
            client.release();
        }
    } catch (e) {
        console.error("❌ Migration failed:", e.message);
        // Don't exit, let the app try to run anyway
    }
}

async function start() {
    // 1. Database & State Init
    const sql = fs.readFileSync(path.join(__dirname, 'db/init.sql')).toString();
    await pool.query(sql);
    await stateManager.initialize();

    await migrate(); // This fixes columns if tables DO exist but are old

    // 2. Setup Blockchain Connection (The Sequencer Wallet)
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const rollupContract = new ethers.Contract(ROLLUP_ADDRESS, ROLLUP_ABI, wallet);
    console.log(`🔗 Connected to Sepolia. Wallet: ${wallet.address}`);

    // --- ROUTES ---
    app.post('/account', async (req, res) => {
        const { index, balance, pubkey } = req.body;
        await pool.query(
            'INSERT INTO accounts (index, address, pubkey, balance) VALUES ($1, $2, $3, $4)',
            [index, "0xTest", pubkey, balance]
        );
        await stateManager.initialize();
        res.json({ status: 'ok' });
    });

    app.post('/transfer', async (req, res) => {
        const { from, to, amount } = req.body;
        const txId = await stateManager.enqueueTransfer(from, to, amount);
        res.json({ txId, status: 'pending' });
    });

    app.get('/state', async (req, res) => {
        const root = await stateManager.zkState.getRoot();
        const onChainRoot = await rollupContract.stateRoot();
        res.json({ 
            l2Root: root,
            l1Root: onChainRoot.toString() // Convert BigInt to string
        });
    });

    // New Endpoint: Get Account Balance
    app.get('/account/:index', async (req, res) => {
        const { index } = req.params;
        const result = await pool.query('SELECT * FROM accounts WHERE index = $1', [index]);
        if(result.rows.length === 0) return res.status(404).json({error: "Not found"});
        res.json(result.rows[0]);
    });

    // New Endpoint: Check Transaction Status
    app.get('/transaction/:id', async (req, res) => {
        const { id } = req.params;
        const result = await pool.query('SELECT status FROM transactions WHERE id = $1', [id]);
        if(result.rows.length === 0) return res.status(404).json({error: "Not found"});
        res.json(result.rows[0]);
    });

    // --- EVENT LISTENER: L1 DEPOSITS ---
    console.log("👂 Listening for Deposit events on L1...");
    
    // ethers.js v6 syntax
    rollupContract.on("Deposit", async (accountIndex, amount, sender, event) => {
        console.log(`⬇️  DETECTED DEPOSIT: ${amount} wei for Account ${accountIndex}`);
        
        // Convert BigInt to Number (for our simple DB)
        // In prod, stick to BigInt everywhere
        const idx = Number(accountIndex);
        const val = Number(amount);

        try {
            // 1. Check if account exists, if not, creating it is tricky without PubKey.
            // Assumption: User deposits to an EXISTING account index.
            
            // 2. Add Transaction to Mempool (Type: DEPOSIT)
            // We reuse the transfer logic but with FROM = 0 (Mint) or similar.
            // Let's manually inject it into the DB/State for simplicity.
            
            // Lock DB for safety (simplified here)
            const client = await pool.connect();
            try {
                // Get current balance
                const res = await client.query('SELECT balance, pubkey FROM accounts WHERE index = $1', [idx]);
                
                if (res.rows.length === 0) {
                    console.log("⚠️ Account not found. Creating temporary account.");
                    await client.query(
                        'INSERT INTO accounts (index, address, pubkey, balance) VALUES ($1, $2, $3, $4)',
                        [idx, sender, "0", val]
                    );
                } else {
                    const newBalance = Number(res.rows[0].balance) + val;
                    await client.query('UPDATE accounts SET balance = $1 WHERE index = $2', [newBalance, idx]);
                }
                
                // Trigger a State Update (Rebuild Tree)
                await stateManager.initialize(); // Lazy sync
                
                // Generate a "System Proof" to update the root on L1? 
                // In this simplified architecture, we wait for the NEXT transfer to pick up the new root.
                // Or we can enqueue a dummy transfer (0->0) to trigger a proof generation.
                await stateManager.enqueueTransfer(idx, idx, 0); 
                
                console.log(`✅ L2 Account ${idx} Credited with ${val}`);
            } finally {
                client.release();
            }

        } catch (e) {
            console.error("Error processing deposit:", e);
        }
    });

    // --- EVENT LISTENER: WITHDRAWAL REQUESTS ---
    console.log("👂 Listening for Withdrawal requests...");
    
    rollupContract.on("WithdrawalRequested", async (requestId, accountIndex, amount, receiver, event) => {
        console.log(`⬇️  WITHDRAWAL REQUEST #${requestId}: ${amount} wei from Account ${accountIndex}`);
        
        // Logic remains the same: Queue it in DB
        const idx = Number(accountIndex);
        const val = Number(amount);
        const txId = await stateManager.enqueueTransfer(idx, 0, val);
        
        await pool.query(
            `UPDATE transactions SET type = 'WITHDRAWAL', to_address = $1 WHERE id = $2`,
            [receiver, txId]
        );
    });

    // New Endpoint: Block Explorer Data
    app.get('/explorer/transactions', async (req, res) => {
        try {
            // Get last 20 transactions, newest first
            const result = await pool.query(`
                SELECT id, from_index, to_index, amount, type, status, created_at, to_address 
                FROM transactions 
                ORDER BY id DESC 
                LIMIT 20
            `);
            res.json(result.rows);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    //  Serve the configuration to the frontend
    app.get('/config', (req, res) => {
        res.json({
            rollupAddress: ROLLUP_ADDRESS,
            // You can add other public config here if needed
        });
    });

    

    app.listen(3000, () => {
        console.log('🚀 L2 Node API running on port 3000');
    });

    // --- THE SEQUENCER LOOP ---
    setInterval(async () => {
        try {
            const job = await stateManager.processPendingBatch();
            
            if (job) {
                console.log(`⚙️  Worker: Processing Tx ${job.txId}...`);

                // 1. Generate Proof
                const circuitInput = {
                    leaf: job.proofData.leafHash,
                    pathElements: job.proofData.pathElements,
                    pathIndices: job.proofData.pathIndices
                };
                const { proof, publicSignals } = await prover.generateProof(circuitInput);

                // 2. Prepare Solidity Data
                const rawCallData = await snarkjs.plonk.exportSolidityCallData(proof, publicSignals);
                const splitIndex = rawCallData.indexOf("]");
                const proofString = rawCallData.substring(0, splitIndex + 1);
                const pubSignalsString = rawCallData.substring(splitIndex + 1).trim().replace(/^,/, "").trim();

                const proofArray = JSON.parse(proofString);
                const pubSignalsArray = JSON.parse(pubSignalsString);
                const newRoot = pubSignalsArray[0];

                // 3. CHECK IF THIS IS A WITHDRAWAL
                // We need to look up the transaction details
                const txRes = await pool.query('SELECT type, to_address, amount FROM transactions WHERE id = $1', [job.txId]);
                const txData = txRes.rows[0];

                let withdrawalReceivers = [];
                let withdrawalAmounts = [];

                if (txData.type === 'WITHDRAWAL') {
                    console.log(`💸 Processing Outbound Withdrawal of ${txData.amount} to ${txData.to_address}`);
                    withdrawalReceivers.push(txData.to_address);
                    withdrawalAmounts.push(txData.amount);
                }

                // 4. Submit Batch
                console.log(`🔗 Submitting Batch to Sepolia... (New Root: ${newRoot})`);
                
                // CALL THE NEW FUNCTION SIGNATURE
                const tx = await rollupContract.submitBatch(
                    newRoot, 
                    proofArray, 
                    withdrawalReceivers, 
                    withdrawalAmounts
                );
                
                console.log(`⏳ Tx Hash: ${tx.hash}. Waiting for confirmation...`);
                await tx.wait();
                console.log(`✅ Batch Confirmed on L1!`);

                await pool.query(
                    `UPDATE transactions SET status = 'ON_CHAIN', proof = $2 WHERE id = $1`, 
                    [job.txId, JSON.stringify(proof)]
                );
            }
        } catch (e) {
            console.error("❌ Sequencer Error:", e.message);
        }
    }, 10000);
}

start();