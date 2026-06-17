const fs = require('fs');
const content = fs.readFileSync('d:/Documentos/antigravity/spa/Spa/src/app/admin/citas/[id]/page.tsx', 'utf8');
const lines = content.split(/\r?\n/);
for (let i = 415; i < 432; i++) {
    console.log(`${i + 1}: ${JSON.stringify(lines[i])}`);
}
