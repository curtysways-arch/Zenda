import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./prisma/dev.db');

db.all("PRAGMA table_info(Cancha);", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log("Cancha columns:");
        console.log(rows.map(r => r.name).join(', '));
    }
});

db.all("PRAGMA table_info(Negocio);", (err, rows) => {
     if (err) {
         console.error(err);
     } else {
         console.log("Negocio columns:");
         console.log(rows.map(r => r.name).join(', '));
     }
 });
 
db.all("PRAGMA table_info(Appointment);", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log("Appointment columns:");
        console.log(rows.map(r => r.name).join(', '));
    }
});
