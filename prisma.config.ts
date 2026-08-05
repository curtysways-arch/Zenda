import "dotenv/config";
import { defineConfig } from "prisma/config";

// ─────────────────────────────────────────────────────────────────────────────
// Prisma 7 Config – Fuente única de verdad para la conexión a la base de datos
//
// DESARROLLO : DATABASE_URL=file:./dev.db  (SQLite vía libSQL)
// PRODUCCIÓN : DATABASE_URL=postgresql://user:pass@host:5432/db?schema=public
//
// La variable DATABASE_URL se lee del archivo .env (cargado por dotenv/config).
// ─────────────────────────────────────────────────────────────────────────────

let dbUrl = process.env["DATABASE_URL"] || "file:./dev.db";
if (!dbUrl.startsWith("file:") && !dbUrl.startsWith("postgres:") && !dbUrl.startsWith("postgresql:")) {
    dbUrl = "file:./dev.db";
}

export default defineConfig({
    schema: "prisma/schema.prisma",
    datasource: {
        url: dbUrl,
    },
    migrations: {
        seed: "npx tsx prisma/seed.ts",
    },
});
