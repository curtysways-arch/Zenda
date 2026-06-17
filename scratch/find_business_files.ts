import * as fs from 'fs';
import * as path from 'path';

function findFileContains(dir: string, term: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
                findFileContains(fullPath, term);
            }
        } else {
            if (file.toLowerCase().includes(term.toLowerCase())) {
                console.log(`Found: ${fullPath}`);
            }
        }
    }
}

console.log("Searching for files containing 'business'...");
findFileContains('.', 'business');
console.log("Search completed.");
