const { Pool } = require('pg');
const ZkState = require('./state');

// Use the Environment Variable (injected by K8s), fallback to localhost only for local testing
const connectionString = process.env.DATABASE_URL || "postgres://admin:password@localhost:5432/zkrollup";

// Database Connection
const pool = new Pool({
    connectionString: connectionString
});

class StateManager {
    constructor() {
        this.zkState = new ZkState();
        this.isInitialized = false;
    }

    // 1. Initialize: Connect to DB + Rebuild Merkle Tree
    async initialize() {
        console.log("🔄 Syncing State from Database...");
        
        // Init the crypto core
        await this.zkState.initialize();

        // Fetch all accounts sorted by index
        const res = await pool.query('SELECT * FROM accounts ORDER BY index ASC');
        
        if (res.rows.length === 0) {
            console.log("⚠️ No accounts found. Initializing empty tree.");
        } else {
            console.log(`📦 Found ${res.rows.length} accounts. Rebuilding tree...`);
            for (const row of res.rows) {
                // Re-insert into in-memory tree
                // Logic: insertAccount(index, balance, pubKey)
                await this.zkState.insertAccount(
                    row.index, 
                    BigInt(row.balance), 
                    BigInt(row.pubkey)
                );
            }
        }
        
        const root = await this.zkState.getRoot();
        console.log(`✅ State Synced! Current Root: ${root}`);
        this.isInitialized = true;
    }

    // 2. Add Transaction (Mempool)
    async enqueueTransfer(fromIndex, toIndex, amount) {
        // Basic Checks
        // In a real rollup, we verify the signature here!
        
        // Insert into DB
        const res = await pool.query(
            `INSERT INTO transactions (from_index, to_index, amount) 
             VALUES ($1, $2, $3) RETURNING id`,
            [fromIndex, toIndex, amount]
        );
        console.log(`📝 Tx Enqueued: ID ${res.rows[0].id}`);
        return res.rows[0].id;
    }

    // 3. Process Batch (The Worker Logic)
    async processPendingBatch() {
        // Lock the next PENDING transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get 1 pending tx (Simplified Batch Size = 1 for now)
            const res = await client.query(
                `SELECT * FROM transactions WHERE status = 'PENDING' ORDER BY id ASC LIMIT 1 FOR UPDATE`
            );

            if (res.rows.length === 0) {
                await client.query('ROLLBACK');
                return null; // Nothing to do
            }

            const tx = res.rows[0];
            const oldRoot = await this.zkState.getRoot();

            console.log(`⚙️ Processing Tx ${tx.id}: Transfer ${tx.amount} from ${tx.from_index} to ${tx.to_index}`);

            // --- OFF-CHAIN EXECUTION ---
            // 1. Get current data
            // (In reality, we need 'leaves' accessor in ZkState, but assuming we track it)
            // For this phase, we just UPDATE the accounts in DB and Memory
            
            // NOTE: This logic assumes accounts exist. In real app, check existence.
            
            // 2. Update In-Memory Tree
            // Decrement Sender
            // Increment Receiver
            // *This requires extending ZkState to support 'getAccount' or tracking balances locally*
            // For this scaffold, we will just PROVE inclusion of the Sender to test the pipeline.
            
            // Generate Proof (The logic you verified in Phase 2)
            const proofData = await this.zkState.generateProof(tx.from_index);
            
            // 3. Update Status
            await client.query(
                `UPDATE transactions SET status = 'PROCESSED' WHERE id = $1`,
                [tx.id]
            );

            await client.query('COMMIT');
            
            // 4. Return Data for the Prover
            return {
                txId: tx.id,
                oldRoot,
                proofData: proofData
            };

        } catch (e) {
            await client.query('ROLLBACK');
            console.error("❌ Batch Processing Failed:", e);
            throw e;
        } finally {
            client.release();
        }
    }
}

module.exports = new StateManager();