import { createClient } from '@libsql/client';

async function createTables() {
    console.log("Iniciando creación de tablas del Growth Engine en SQLite local vía LibSQL Client...");
    
    const client = createClient({
        url: 'file:./dev.db'
    });

    const tables = [
        // 1. Season
        `CREATE TABLE IF NOT EXISTS "Season" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "negocioId" TEXT NOT NULL,
            "nombre" TEXT NOT NULL,
            "descripcion" TEXT,
            "fechaInicio" DATETIME NOT NULL,
            "fechaFin" DATETIME NOT NULL,
            "activa" BOOLEAN NOT NULL DEFAULT true,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL,
            CONSTRAINT "Season_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )`,
        
        // 2. Campaign
        `CREATE TABLE IF NOT EXISTS "Campaign" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "negocioId" TEXT,
            "nombre" TEXT NOT NULL,
            "descripcion" TEXT,
            "activa" BOOLEAN NOT NULL DEFAULT true,
            "isMarketplace" BOOLEAN NOT NULL DEFAULT false,
            "downloads" INTEGER NOT NULL DEFAULT 0,
            "rating" REAL NOT NULL DEFAULT 5.0,
            "benefits" TEXT,
            "difficulty" TEXT NOT NULL DEFAULT 'MEDIA',
            "estImprovement" REAL NOT NULL DEFAULT 0.0,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL,
            "seasonId" TEXT,
            CONSTRAINT "Campaign_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "Campaign_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )`,

        // 3. Quest
        `CREATE TABLE IF NOT EXISTS "Quest" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "negocioId" TEXT,
            "campaignId" TEXT NOT NULL,
            "nombre" TEXT NOT NULL,
            "descripcion" TEXT NOT NULL,
            "imagenUrl" TEXT,
            "icono" TEXT NOT NULL DEFAULT 'Award',
            "color" TEXT NOT NULL DEFAULT '#ec4899',
            "visible" BOOLEAN NOT NULL DEFAULT true,
            "repetible" BOOLEAN NOT NULL DEFAULT false,
            "limiteUsuario" INTEGER NOT NULL DEFAULT 1,
            "limiteGlobal" INTEGER,
            "fechaInicio" DATETIME,
            "fechaFin" DATETIME,
            "activa" BOOLEAN NOT NULL DEFAULT true,
            "parentQuestId" TEXT,
            "segmentacion" TEXT,
            "validacionTipo" TEXT NOT NULL DEFAULT 'AUTOMATICO',
            "triggerEvent" TEXT NOT NULL,
            "servicioId" TEXT,
            "montoMinimo" REAL,
            "cantidadMeta" INTEGER NOT NULL DEFAULT 1,
            "condicionesExtra" TEXT,
            "acciones" TEXT NOT NULL,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL,
            CONSTRAINT "Quest_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "Quest_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )`,

        // 4. QuestProgress
        `CREATE TABLE IF NOT EXISTS "QuestProgress" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "questId" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "progresoActual" INTEGER NOT NULL DEFAULT 0,
            "progresoRequerido" INTEGER NOT NULL DEFAULT 1,
            "estado" TEXT NOT NULL DEFAULT 'EN_PROGRESO',
            "fechaCompletada" DATETIME,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL,
            CONSTRAINT "QuestProgress_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "QuestProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )`,

        // 5. QuestParticipant
        `CREATE TABLE IF NOT EXISTS "QuestParticipant" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "questId" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "action" TEXT NOT NULL,
            "detalles" TEXT,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "QuestParticipant_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "QuestParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )`,

        // 6. LevelTier
        `CREATE TABLE IF NOT EXISTS "LevelTier" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "negocioId" TEXT NOT NULL,
            "nombre" TEXT NOT NULL,
            "puntosRequeridos" INTEGER NOT NULL DEFAULT 0,
            "icono" TEXT,
            "beneficios" TEXT,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL,
            CONSTRAINT "LevelTier_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )`,

        // 7. UserLevel
        `CREATE TABLE IF NOT EXISTS "UserLevel" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "userId" TEXT NOT NULL UNIQUE,
            "negocioId" TEXT NOT NULL,
            "levelId" TEXT NOT NULL,
            "puntosTier" INTEGER NOT NULL DEFAULT 0,
            "xpTotal" INTEGER NOT NULL DEFAULT 0,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL,
            CONSTRAINT "UserLevel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "UserLevel_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "LevelTier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        )`,

        // 8. Badge
        `CREATE TABLE IF NOT EXISTS "Badge" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "negocioId" TEXT NOT NULL,
            "nombre" TEXT NOT NULL,
            "descripcion" TEXT NOT NULL,
            "icono" TEXT NOT NULL DEFAULT 'Award',
            "color" TEXT NOT NULL DEFAULT '#f59e0b',
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL,
            CONSTRAINT "Badge_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )`,

        // 9. UserBadge
        `CREATE TABLE IF NOT EXISTS "UserBadge" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "userId" TEXT NOT NULL,
            "badgeId" TEXT NOT NULL,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )`,

        // 10. UserStreak
        `CREATE TABLE IF NOT EXISTS "UserStreak" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "negocioId" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "rachaActual" INTEGER NOT NULL DEFAULT 0,
            "rachaMaxima" INTEGER NOT NULL DEFAULT 0,
            "fechaUltimaCita" DATETIME,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL,
            CONSTRAINT "UserStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "UserStreak_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )`,

        // 11. QuestEventLog
        `CREATE TABLE IF NOT EXISTS "QuestEventLog" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "negocioId" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "eventType" TEXT NOT NULL,
            "payload" TEXT NOT NULL,
            "procesado" BOOLEAN NOT NULL DEFAULT false,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    const indexes = [
        `CREATE UNIQUE INDEX IF NOT EXISTS "LevelTier_negocioId_puntosRequeridos_key" ON "LevelTier"("negocioId", "puntosRequeridos")`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "QuestProgress_questId_userId_key" ON "QuestProgress"("questId", "userId")`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId")`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "UserStreak_userId_negocioId_key" ON "UserStreak"("userId", "negocioId")`,
        `CREATE INDEX IF NOT EXISTS "QuestEventLog_procesado_createdAt_idx" ON "QuestEventLog"("procesado", "createdAt")`
    ];

    for (const sql of tables) {
        try {
            await client.execute(sql);
        } catch(e) {
            console.error("Error creando tabla:", e.message);
        }
    }

    for (const sql of indexes) {
        try {
            await client.execute(sql);
        } catch(e) {
            console.error("Error creando índice:", e.message);
        }
    }

    console.log("Creación de tablas e índices del Growth Engine completada con éxito.");
}

createTables().finally(() => process.exit(0));
