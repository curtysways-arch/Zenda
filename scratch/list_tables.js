const path = require('path');
const { createClient } = require('@libsql/client');

const dbPath = path.resolve(process.cwd(), 'dev.db');
const urlPath = dbPath.replace(/\\/g, '/');
const url = urlPath.startsWith('/') ? `file://${urlPath}` : `file:///${urlPath}`;
console.log('Connecting to:', url);

const client = createClient({ url });

async function main() {
    // List all tables
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    console.log('\n--- TABLES IN DB ---');
    tables.rows.forEach(r => console.log(' -', r[0]));

    // Try lowercase
    try {
        const s = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%erv%'");
        console.log('\n--- Tables with Serv ---');
        s.rows.forEach(r => console.log(' -', r[0]));
    } catch(e) { console.error(e.message); }

    client.close();
}

main().catch(err => { console.error(err.message); process.exit(1); });
