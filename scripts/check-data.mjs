import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const client = createClient({ url: process.env.DATABASE_URL });

const negocios = await client.execute({ sql: 'SELECT id, nombre, slug FROM Negocio', args: [] });
console.log('Negocios:', JSON.stringify(negocios.rows, null, 2));

const usuarios = await client.execute({ sql: "SELECT id, email, role, negocioId FROM Usuario", args: [] });
console.log('Usuarios:', JSON.stringify(usuarios.rows, null, 2));

const planes = await client.execute({ sql: "SELECT id, name, courses_module FROM Plan", args: [] });
console.log('Planes:', JSON.stringify(planes.rows, null, 2));

const suscs = await client.execute({ sql: "SELECT id, negocioId, planId, estado FROM Suscripcion", args: [] });
console.log('Suscripciones:', JSON.stringify(suscs.rows, null, 2));

const courses = await client.execute({ sql: "SELECT id, name, status, businessId FROM Course", args: [] });
console.log('Cursos:', JSON.stringify(courses.rows, null, 2));

await client.close();
