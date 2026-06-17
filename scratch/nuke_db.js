const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./dev.db', (err) => {
    db.serialize(() => {
        db.run('DELETE FROM Reserva');
        db.run('DELETE FROM Cancha');
        db.run('DELETE FROM Staff');
        db.run('DELETE FROM _StaffServices');
        db.run('DELETE FROM Negocio');
        db.run('DELETE FROM Suscripcion');
        db.run('DELETE FROM Plan');
        db.run('DELETE FROM Usuario', () => {
            console.log("🔥 Base de datos LIMPIA.");
            db.close();
        });
    });
});
