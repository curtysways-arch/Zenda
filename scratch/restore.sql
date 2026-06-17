-- Restaurar Negocio
INSERT OR IGNORE INTO "Negocio" ("id", "nombre", "slug", "propietario", "whatsapp", "direccion", "ciudad", "precioHora", "horarioApertura", "horarioCierre", "updatedAt") 
VALUES ('demo-id', 'Demo Spa & Bienestar', 'demo-spa', 'Admin Demo', '5215500000000', 'Calle Ficticia 123', 'CDMX', 50, '08:00', '20:00', CURRENT_TIMESTAMP);

-- Restaurar Categoria
INSERT OR IGNORE INTO "Category" ("id", "nombre", "businessId", "updatedAt") 
VALUES ('cat-id', 'Masajes', 'demo-id', CURRENT_TIMESTAMP);

-- Restaurar Servicio
INSERT OR IGNORE INTO "Service" ("id", "nombre", "descripcion", "precio", "duracion", "businessId", "categoryId", "updatedAt") 
VALUES ('service-id', 'Corte de cabello', 'Corte profesional', 8, 50, 'demo-id', 'cat-id', CURRENT_TIMESTAMP);

-- Restaurar Staff
INSERT OR IGNORE INTO "Staff" ("id", "name", "role", "businessId", "active", "workingHours", "updatedAt") 
VALUES ('staff-id', 'Ana García', 'Estilista', 'demo-id', 1, '{"monday":{"start":"08:00","end":"20:00"}}', CURRENT_TIMESTAMP);

-- Relacionar Staff y Servicio
INSERT OR IGNORE INTO "_StaffServices" ("A", "B") 
VALUES ('service-id', 'staff-id');
