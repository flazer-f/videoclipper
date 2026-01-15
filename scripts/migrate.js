const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' }); // Load .env.local if present

// If dotenv is not installed, we assume vars are in process env or setup manually.
// To run this: node scripts/migrate.js

const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // e.g. postgresql://postgres:postgres@localhost:5432/videoclipper
});

async function migrate() {
    try {
        const sqlPath = path.join(__dirname, '../migrations/001_init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration...');
        await pool.query(sql);
        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
}

migrate();
