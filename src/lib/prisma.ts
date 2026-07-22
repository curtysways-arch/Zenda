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
    const isAbsolute = rawPath.startsWith('/') || rawPath.startsWith('\\') || /^[a-zA-Z]:/.test(rawPath);
    const absPath = isAbsolute ? rawPath : `${process.cwd()}/${rawPath}`;
    // Normalizar separadores (Windows → forward slash)
    const normalized = absPath.split(/[/\\]/).join('/');
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
        const { PrismaLibSql } = require('@prisma/adapter-libsql');

        const resolvedUrl = resolveLibSqlUrl(dbUrl);
        const adapter = new PrismaLibSql({ url: resolvedUrl });

        return new PrismaClient({
            adapter,
            log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        });
    }
}

// Inicialización perezosa (lazy) mediante un Proxy.
// Evita evaluar la base de datos durante la compilación estática de Next.js.
let prismaInstance: PrismaClient | null = null;

function getPrisma(): PrismaClient {
    if (!prismaInstance) {
        prismaInstance = globalThis.prisma ?? createPrismaClientSync();
        if (process.env.NODE_ENV !== 'production') {
            globalThis.prisma = prismaInstance;
        }
    }
    return prismaInstance;
}

const prisma = new Proxy({} as PrismaClient, {
    get(target, prop, receiver) {
        // Evitar interceptar propiedades internas usadas por frameworks u optimizadores
        if (prop === '$$typeof' || prop === 'then' || prop === 'constructor' || prop === 'toJSON') {
            return undefined;
        }
        const instance = getPrisma();
        const value = Reflect.get(instance, prop);
        if (typeof value === 'function') {
            return value.bind(instance);
        }
        return value;
    }
});

export default prisma;
export { prisma };

