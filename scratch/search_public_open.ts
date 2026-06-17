import * as fs from 'fs';

const content = fs.readFileSync('src/app/[slug]/page.tsx', 'utf-8');
const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.toLowerCase().includes('abierto') || line.toLowerCase().includes('cerrado') || line.toLowerCase().includes('isopen') || line.toLowerCase().includes('dias') || line.toLowerCase().includes('configuracion')) {
        console.log(`L${index + 1}: ${line.trim()}`);
    }
});
