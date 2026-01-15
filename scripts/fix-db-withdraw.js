const { Pool } = require('pg');
const pool = new Pool({ connectionString: "postgres://admin:password@localhost:5432/zkrollup" });

async function fix() {
    await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'TRANSFER';`);
    await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS to_address TEXT;`);
    console.log("✅ Added columns for withdrawals");
    await pool.end();
}
fix();