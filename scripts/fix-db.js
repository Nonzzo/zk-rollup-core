const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgres://admin:password@localhost:5432/zkrollup"
});

async function fix() {
    try {
        console.log("🛠️  Migrating Database...");
        
        // 1. Add the missing 'proof' column
        await pool.query(`
            ALTER TABLE transactions 
            ADD COLUMN IF NOT EXISTS proof TEXT;
        `);
        console.log("✅ Added 'proof' column to transactions table.");

    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        await pool.end();
    }
}

fix();