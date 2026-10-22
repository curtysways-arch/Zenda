const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('C:/Users/PC/Desktop/Video MetalOS/Spa/dev.db');

db.all("SELECT id, businessId, title, image, mobileImage, customImageUrl, isActive FROM HeroItem", (err, rows) => {
  if (err) {
    db.all("PRAGMA table_info(HeroItem)", (e, cols) => {
      console.log('Cols HeroItem:', cols?.map(c => c.name));
      db.all("SELECT * FROM HeroItem", (e2, r2) => {
        console.log('Sample HeroItem:', r2);
        db.close();
      });
    });
  } else {
    console.log('HeroItems:', rows);
    db.close();
  }
});
