const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./dev.db');

db.serialize(() => {
    console.log('--- TABLES ---');
    db.all("SELECT name FROM sqlite_master WHERE type='table';", [], (err, rows) => {
        if (err) console.error(err);
        console.log(rows);
    });

    console.log('--- RESERVA COUNT ---');
    db.all("SELECT count(*) as count FROM Reserva;", [], (err, rows) => {
        if (err) {
            console.log('Error querying Reserva table. Maybe it does not exist?');
            // Try Appointment
            db.all("SELECT count(*) as count FROM Appointment;", [], (err2, rows2) => {
                if (err2) console.error('Neither Reserva nor Appointment found');
                else console.log('Appointment count:', rows2);
            });
        } else {
            console.log('Reserva count:', rows);
        }
    });

    console.log('--- RATING TABLE INFO ---');
    db.all("PRAGMA table_info(Rating);", [], (err, rows) => {
        if (err) console.error(err);
        console.log(rows);
    });
});

db.close();
