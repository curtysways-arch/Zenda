const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./dev.db', (err) => {
    const BID = 'cmmlfry6q0004l0w54cdbpyx9';
    db.serialize(() => {
        // 1. Branding Negocio
        db.run(`UPDATE Negocio SET 
            colorPrimario = '#059669', 
            colorSecundario = '#10b981', 
            colorTerciario = '#f0fdf4',
            colorNeutral = '#f8fafc',
            colorTexto = '#064e3b',
            saludoTitulo = 'Bienvenida a Spa Premium',
            nombreFallback = 'Invitada Especial',
            mensajeBienvenida = 'Relaja tu cuerpo y mente con nuestros tratamientos exclusivos diseñados para tu bienestar total.',
            heroTitulo = 'Tu Refugio de Serenidad',
            heroSubtitulo = 'Descubre el equilibrio perfecto entre lujo y relajación.',
            logoUrl = '/images/demo/logo.png'
        WHERE id = '${BID}'`);

        // 2. Categorías y Servicios
        db.run(`INSERT OR IGNORE INTO "TipoCancha" ("id", "nombre", "negocioId", "updatedAt") VALUES ('cat-faciales', 'Tratamientos Faciales', '${BID}', CURRENT_TIMESTAMP)`);
        db.run(`INSERT OR IGNORE INTO "Cancha" ("id", "nombre", "duracion", "precio", "estaActivo", "negocioId", "categoryId", "updatedAt") 
                VALUES ('serv-facial-1', 'Limpieza Facial Profunda', 60, 45, 1, '${BID}', 'cat-faciales', CURRENT_TIMESTAMP)`);
        
        db.run(`INSERT OR IGNORE INTO "Cancha" ("id", "nombre", "duracion", "precio", "estaActivo", "negocioId", "categoryId", "updatedAt") 
                VALUES ('serv-masaje-pro', 'Masaje Aromaterapia', 90, 75, 1, '${BID}', 'cat-1', CURRENT_TIMESTAMP)`);

        // 3. Imágenes de Servicios
        db.run(`INSERT OR IGNORE INTO "Imagen" ("id", "url", "negocioId", "serviceId", "tipo", "createdAt") 
                VALUES ('img-serv-1', '/images/demo/after.png', '${BID}', 'serv-facial-1', 'GALERIA', CURRENT_TIMESTAMP)`);
        db.run(`INSERT OR IGNORE INTO "Imagen" ("id", "url", "negocioId", "serviceId", "tipo", "createdAt") 
                VALUES ('img-serv-2', '/images/demo/service.png', '${BID}', 'serv-masaje-pro', 'GALERIA', CURRENT_TIMESTAMP)`);

        // 4. Promociones
        db.run(`INSERT OR IGNORE INTO "Promotion" ("id", "businessId", "titulo", "descripcion", "precioPromo", "precioAnterior", "imagenUrl", "fechaInicio", "fechaFin", "estado", "updatedAt") 
                VALUES ('promo-1', '${BID}', 'Lunes de Relax', '20% de descuento en todos los masajes.', 60, 75, '/images/demo/hero.png', '2026-01-01', '2026-12-31', 'publicado', CURRENT_TIMESTAMP)`);

        // 5. Cursos
        db.run(`INSERT OR IGNORE INTO "Course" ("id", "name", "description", "imageUrl", "price", "payment_type", "capacity", "status", "businessId", "createdAt", "updatedAt") 
                VALUES ('course-1', 'Taller de Auto-Cuidado Facial', 'Aprende las mejores técnicas para cuidar tu piel desde casa.', '/images/demo/after.png', 29.99, 'ONE_TIME', 20, 'active', '${BID}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);

        // 6. Mis Trabajos (Portafolio)
        db.run(`INSERT OR IGNORE INTO "Resultado" ("id", "businessId", "title", "description", "beforeImage", "afterImage", "type", "staffId", "serviceId", "published", "createdAt", "updatedAt") 
                VALUES ('res-1', '${BID}', 'Facial Anti-Edad', 'Resultados visibles tras una sola sesión de hidratación profunda.', '/images/demo/before.png', '/images/demo/after.png', 'BEFORE_AFTER', 'staff-ana', 'serv-facial-1', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);

        console.log("✅ Negocio Demo RE-configurado correctamente (v3).");
        db.close();
    });
});
