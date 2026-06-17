import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const client = createClient({ url: process.env.DATABASE_URL });

const tables = ['Plan', 'Negocio', 'Usuario', 'Course', 'CourseEnrollment', 'Student', 'Suscripcion', 'Cancha'];

for (const t of tables) {
    try {
        const r = await client.execute({ sql: `PRAGMA table_info(${t})`, args: [] });
        const cols = r.rows.map(row => row.name).join(', ');
        console.log(`\n${t}: ${cols}`);
    } catch (e) {
        console.log(`${t}: ERROR - ${e.message}`);
    }
}

await client.close();
