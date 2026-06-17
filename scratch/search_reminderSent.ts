import * as fs from 'fs';
import * as path from 'path';

function searchInDir(dir: string, pattern: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
                searchInDir(fullPath, pattern);
            }
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
                const content = fs.readFileSync(fullPath, 'utf-8');
                if (content.includes(pattern)) {
                    console.log(`Found "${pattern}" in: ${fullPath}`);
                    // Mostrar líneas coincidentes
                    const lines = content.split('\n');
                    lines.forEach((line, index) => {
                        if (line.includes(pattern)) {
                            console.log(`  L${index + 1}: ${line.trim()}`);
                        }
                    });
                }
            }
        }
    }
}

console.log("Searching for 'reminderSent'...");
searchInDir('./src', 'reminderSent');
console.log("Search completed.");
