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
        db.run(`INSERT OR IGNORE INTO "Cancha" ("id", "nombre", "duracion", "precio", "estaActivo", "negocioId", "categoryId", "mainImage", "updatedAt") 
                VALUES ('serv-facial-1', 'Limpieza Facial Profunda', 60, 45, 1, '${BID}', 'cat-faciales', '/images/demo/after.png', CURRENT_TIMESTAMP)`);
        
        db.run(`INSERT OR IGNORE INTO "Cancha" ("id", "nombre", "duracion", "precio", "estaActivo", "negocioId", "categoryId", "mainImage", "updatedAt") 
                VALUES ('serv-masaje-pro', 'Masaje Aromaterapia', 90, 75, 1, '${BID}', 'cat-1', '/images/demo/service.png', CURRENT_TIMESTAMP)`);

        // 3. Promociones
        db.run(`INSERT OR IGNORE INTO "Promocion" ("id", "nombre", "descripcion", "porcentaje", "negocioId", "isActive", "imagenUrl", "fechaInicio", "fechaFin") 
                VALUES ('promo-1', 'Lunes de Relax', '20% de descuento en todos los masajes.', 20, '${BID}', 1, '/images/demo/hero.png', '2026-01-01', '2026-12-31')`);

        // 4. Cursos
        db.run(`INSERT OR IGNORE INTO "Course" ("id", "title", "description", "price", "businessId", "bannerUrl", "createdAt", "updatedAt") 
                VALUES ('course-1', 'Taller de Auto-Cuidado Facial', 'Aprende las mejores técnicas para cuidar tu piel desde casa.', 29.99, '${BID}', '/images/demo/after.png', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
        db.run(`INSERT OR IGNORE INTO "CourseSession" ("id", "courseId", "title", "date", "duration", "updatedAt") 
                VALUES ('sess-1', 'course-1', 'Sesión 1: Análisis de Piel', '${new Date().toISOString()}', 120, CURRENT_TIMESTAMP)`);

        // 5. Mis Trabajos (Resultados)
        db.run(`INSERT OR IGNORE INTO "Result" ("id", "businessId", "title", "description", "category", "beforeImage", "afterImage", "format", "staffId", "serviceId", "createdAt", "updatedAt") 
                VALUES ('res-1', '${BID}', 'Facial Anti-Edad', 'Resultados visibles tras una sola sesión de hidratación profunda.', 'Facial', '/images/demo/before.png', '/images/demo/after.png', 'BEFORE_AFTER', 'staff-ana', 'serv-facial-1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);

        console.log("✅ Negocio Demo configurado con imágenes, servicios, promos, cursos y portafolio.");
        db.close();
    });
});
