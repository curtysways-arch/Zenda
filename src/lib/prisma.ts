import path from 'path';
import { PrismaClient } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Singleton de PrismaClient – Prisma 7 con adaptadores por entorno
//
// PRODUCCIÓN (PostgreSQL): DATABASE_URL = "postgresql://user:pass@host:5432/db"
// DESARROLLO  (SQLite):    DATABASE_URL = "file:./dev.db"
//
// Prisma 7 requiere un driver adapter explícito (eliminó el motor Rust embebido).
// El adaptador se selecciona automáticamente según el prefijo de DATABASE_URL.
// ─────────────────────────────────────────────────────────────────────────────

declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

/**
 * Resuelve la URL de SQLite relativa a una URL absoluta compatible con libSQL.
 * Ej: "file:./dev.db" → "file:///C:/ruta/absoluta/dev.db"
 */
function resolveLibSqlUrl(dbUrl: string): string {
    if (dbUrl.startsWith('file://')) return dbUrl; // ya es absoluta

    // Quitar prefijo "file:" o "file:./"
    const rawPath = dbUrl.replace(/^file:(\.\/)?/, '');
    const absPath = path.resolve(process.cwd(), rawPath);
    // Normalizar separadores (Windows → forward slash)
    const normalized = absPath.split(path.sep).join('/');
    // En Windows: C:/... → /C:/...
    const prefix = normalized.match(/^[a-zA-Z]:/) ? '/' : '';
    return `file://${prefix}${normalized}`;
}

function createPrismaClientSync(): PrismaClient {
    const dbUrl = process.env['DATABASE_URL'] || 'file:./dev.db';

    if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
        // ── PostgreSQL (producción) ──────────────────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Pool } = require('pg');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { PrismaPg } = require('@prisma/adapter-pg');

        const pool = new Pool({ connectionString: dbUrl });
        const adapter = new PrismaPg(pool);

        return new PrismaClient({
            adapter,
            log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
        });
    } else {
        // ── SQLite / libSQL (desarrollo) ─────────────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { createClient } = require('@libsql/client');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { PrismaLibSql } = require('@prisma/adapter-libsql');

        const resolvedUrl = resolveLibSqlUrl(dbUrl);
        const client = createClient({ url: resolvedUrl });
        const adapter = new PrismaLibSql(client);

        return new PrismaClient({
            adapter,
            log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        });
    }
}

// Patrón singleton compatible con hot-reload de Next.js dev server
const prisma = globalThis.prisma ?? createPrismaClientSync();

export default prisma;

if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = prisma;
}
