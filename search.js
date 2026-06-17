const fs = require('fs');
const dbContent = fs.readFileSync('dev.db', 'utf8');
const index = dbContent.indexOf('Libera tensi');
if (index !== -1) {
    console.log(dbContent.substring(index - 50, index + 100));
} else {
    console.log("Not found in dev.db");
}
