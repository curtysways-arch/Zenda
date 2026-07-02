import "dotenv/config";
import prisma from './src/lib/prisma';

async function migrate() {
    try {
        console.log("Dropping existing tables to recreate...");
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "ReferralReward"`);
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "ReferralEvent"`);
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "ReferralCode"`);
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "ReferralCampaign"`);

        console.log("Creando tabla ReferralCampaign...");
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "ReferralCampaign" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "negocioId" TEXT NOT NULL,
                "nombre" TEXT NOT NULL,
                "descripcion" TEXT,
                "imagenUrl" TEXT,
                "activa" BOOLEAN NOT NULL DEFAULT true,
                "tipoRecompensa" TEXT NOT NULL,
                "valorRecompensa" TEXT NOT NULL,
                "referidosRequeridos" INTEGER NOT NULL,
                "fechaInicio" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "fechaFin" DATETIME,
                "limitePremios" INTEGER,
                "premiosEntregados" INTEGER NOT NULL DEFAULT 0,
                "rankingActivo" BOOLEAN NOT NULL DEFAULT false,
                "tipoIncentivo" TEXT,
                "valorIncentivo" TEXT,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL,
                CONSTRAINT "ReferralCampaign_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
            )
        `);

        console.log("Creando tabla ReferralCode...");
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "ReferralCode" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "userId" TEXT NOT NULL,
                "negocioId" TEXT NOT NULL,
                "codigo" TEXT NOT NULL,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "ReferralCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT "ReferralCode_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
            )
        `);
        await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "ReferralCode_codigo_key" ON "ReferralCode"("codigo")
        `);
        await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "ReferralCode_userId_negocioId_key" ON "ReferralCode"("userId", "negocioId")
        `);

        console.log("Creando tabla ReferralReward...");
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "ReferralReward" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "campaignId" TEXT NOT NULL,
                "negocioId" TEXT NOT NULL,
                "userId" TEXT NOT NULL,
                "estado" TEXT NOT NULL DEFAULT 'DISPONIBLE',
                "fechaEntrega" DATETIME,
                "staffId" TEXT,
                "notas" TEXT,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL,
                CONSTRAINT "ReferralReward_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ReferralCampaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT "ReferralReward_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT "ReferralReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT "ReferralReward_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE
            )
        `);

        console.log("Creando tabla ReferralEvent...");
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "ReferralEvent" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "campaignId" TEXT NOT NULL,
                "codeId" TEXT NOT NULL,
                "negocioId" TEXT NOT NULL,
                "referrerId" TEXT NOT NULL,
                "referredId" TEXT NOT NULL,
                "appointmentId" TEXT,
                "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
                "ipAddress" TEXT,
                "userAgent" TEXT,
                "rewardId" TEXT,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL,
                CONSTRAINT "ReferralEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ReferralCampaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT "ReferralEvent_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "ReferralCode" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT "ReferralEvent_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT "ReferralEvent_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT "ReferralEvent_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "ReferralReward" ("id") ON DELETE SET NULL ON UPDATE CASCADE
            )
        `);

        console.log("Migración local SQLite finalizada con éxito.");
    } catch (e) {
        console.error("Error al ejecutar la migración local:", e.message);
    }
}

migrate().finally(() => process.exit(0));
