CREATE TABLE IF NOT EXISTS accounts (
    index INTEGER PRIMARY KEY,
    address TEXT NOT NULL,
    pubkey TEXT NOT NULL,
    balance NUMERIC(78, 0) DEFAULT 0,
    nonce INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    from_index INTEGER REFERENCES accounts(index),
    to_index INTEGER REFERENCES accounts(index),
    amount NUMERIC(78, 0) NOT NULL,
    status TEXT DEFAULT 'PENDING',
    proof TEXT, -- <--- ENSURE THIS IS ADDED
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS batches (
    id SERIAL PRIMARY KEY,
    old_root TEXT NOT NULL,
    new_root TEXT NOT NULL,
    proof TEXT, -- Store the JSON proof
    tx_ids INTEGER[], -- Array of transaction IDs included
    status TEXT DEFAULT 'PROVED' -- PROVED, SUBMITTED
);