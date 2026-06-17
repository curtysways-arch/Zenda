const path = require('path');
const { createClient } = require('@libsql/client');
const dbPath = path.resolve(process.cwd(), 'dev.db');
const urlPath = dbPath.replace(/\\/g, '/');
const url = urlPath.startsWith('/') ? ('file://' + urlPath) : ('file:///' + urlPath);
const client = createClient({ url });

async function main() {
    try {
        const res = await client.execute("PRAGMA table_info(Cancha)");
        console.log("COLUMNS IN Cancha:");
        res.rows.forEach(r => {
            console.log(`  Column: ${r[1]} | Type: ${r[2]}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        client.close();
    }
}
main();
