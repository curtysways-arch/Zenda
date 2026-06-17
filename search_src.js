const fs = require('fs');
const path = require('path');

function searchFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            searchFiles(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('Libera') || content.includes('tensi') || content.includes('Profilaxis')) {
                console.log(`Found in: ${fullPath}`);
                const lines = content.split('\n');
                lines.forEach((line, i) => {
                    if (line.includes('Libera') || line.includes('tensi') || line.includes('Profilaxis')) {
                        console.log(`Line ${i + 1}: ${line.trim()}`);
                    }
                });
            }
        }
    }
}

searchFiles(path.join(process.cwd(), 'src'));
