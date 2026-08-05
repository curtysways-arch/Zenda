import "dotenv/config";
import { defineConfig } from "prisma/config";

// ─────────────────────────────────────────────────────────────────────────────
// Prisma 7 Config – Fuente única de verdad para la conexión a la base de datos
//
// DESARROLLO : DATABASE_URL=file:./dev.db  (SQLite vía libSQL)
// PRODUCCIÓN : DATABASE_URL=postgresql://user:pass@host:5432/db?schema=public
//
// La variable DATABASE_URL se lee del archivo .env (cargado por dotenv/config).
// El adaptador de driver se configura según el prefijo de DATABASE_URL.
// ─────────────────────────────────────────────────────────────────────────────

const rawUrl = process.env["DATABASE_URL"] || "file:./dev.db";

const isPg = rawUrl.startsWith("postgresql://") || rawUrl.startsWith("postgres://");

// Para PostgreSQL usamos @prisma/adapter-pg con el pool de `pg`
// Para SQLite usamos @prisma/adapter-libsql
function buildAdapter() {
    if (isPg) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Pool } = require("pg");
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { PrismaPg } = require("@prisma/adapter-pg");
        const pool = new Pool({ connectionString: rawUrl });
        return new PrismaPg(pool);
    }
    // SQLite
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaLibSql } = require("@prisma/adapter-libsql");
    const resolvedUrl = rawUrl.startsWith("file://")
        ? rawUrl
        : `file://${rawUrl.replace(/^file:(\.\/)?/, "")}`;
    return new PrismaLibSql({ url: resolvedUrl });
}

export default defineConfig({
    schema: "prisma/schema.prisma",
    datasource: {
        url: rawUrl,
    },
    migrations: {
        seed: "npx tsx prisma/seed.ts",
    },
});
