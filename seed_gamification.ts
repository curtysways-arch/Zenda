import { createClient } from '@libsql/client';

async function seedGamification() {
    console.log("Iniciando seed de Gamificación (Niveles e Insignias) en SQLite local vía LibSQL...");

    const client = createClient({
        url: 'file:./dev.db'
    });

    try {
        // 1. Obtener el primer negocio registrado para asociarle los niveles y badges
        const resNegocio = await client.execute("SELECT id FROM Negocio LIMIT 1");
        const negocio = resNegocio.rows[0];

        if (!negocio) {
            console.warn("No se encontró ningún negocio registrado en la base de datos. Por favor, crea un negocio primero.");
            return;
        }

        const negocioId = String(negocio.id);
        console.log(`Poblando datos de gamificación para el negocio ID: ${negocioId}`);

        // 2. Insertar Tiers de Nivel (LevelTier)
        const tiers = [
            { id: 'tier-bronce', nombre: 'Bronce', puntos: 0, icono: 'Award', beneficios: 'Nivel inicial del club' },
            { id: 'tier-plata', nombre: 'Plata', puntos: 200, icono: 'Award', beneficios: 'Descuento permanente de 5% en servicios faciales' },
            { id: 'tier-oro', nombre: 'Oro', puntos: 500, icono: 'Award', beneficios: 'Descuento de 10% en cualquier servicio y regalo en cumpleaños' },
            { id: 'tier-platino', nombre: 'Platino', puntos: 1000, icono: 'Award', beneficios: 'Reservas prioritarias y 15% de descuento permanente' },
            { id: 'tier-diamante', nombre: 'Diamante', puntos: 2500, icono: 'Award', beneficios: 'Servicios de cortesía y barra libre en el bar' }
        ];

        for (const t of tiers) {
            try {
                await client.execute({
                    sql: `INSERT OR REPLACE INTO "LevelTier" (id, negocioId, nombre, puntosRequeridos, icono, beneficios, updatedAt) 
                          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
                    args: [t.id, negocioId, t.nombre, t.puntos, t.icono, t.beneficios]
                });
            } catch (e) {
                console.error(`Error insertando LevelTier ${t.nombre}:`, e.message);
            }
        }
        console.log("Niveles (LevelTier) creados con éxito.");

        // 3. Insertar Insignias (Badge)
        const badges = [
            { id: 'badge-primer-cliente', nombre: 'Pionero', descripcion: 'Por realizar tu primera reserva con nosotros.', icono: 'Sparkles', color: '#3b82f6' },
            { id: 'badge-cliente-vip', nombre: 'Socio VIP', descripcion: 'Por acumular un nivel de lealtad sobresaliente.', icono: 'Crown', color: '#f59e0b' },
            { id: 'badge-embajador', nombre: 'Embajador', descripcion: 'Por invitar a 3 amigos a unirse al club de lealtad.', icono: 'Users', color: '#06b6d4' }
        ];

        for (const b of badges) {
            try {
                await client.execute({
                    sql: `INSERT OR REPLACE INTO "Badge" (id, negocioId, nombre, descripcion, icono, color, updatedAt) 
                          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
                    args: [b.id, negocioId, b.nombre, b.descripcion, b.icono, b.color]
                });
            } catch (e) {
                console.error(`Error insertando Badge ${b.nombre}:`, e.message);
            }
        }
        console.log("Insignias (Badge) creadas con éxito.");

    } catch (err: any) {
        console.error("Error crítico ejecutando seed:", err.message);
    }
}

seedGamification().finally(() => process.exit(0));
