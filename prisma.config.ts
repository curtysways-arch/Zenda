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

export default defineConfig({
    schema: "prisma/schema.prisma",
    datasource: {
        url: process.env["DATABASE_URL"] || "file:./dev.db",
    },
    migrations: {
        seed: "npx tsx prisma/seed.ts",
    },
});
