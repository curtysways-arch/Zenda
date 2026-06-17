import * as fs from 'fs';
import * as path from 'path';

function findFile(dir: string, name: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
                findFile(fullPath, name);
            }
        } else {
            if (file.startsWith(name)) {
                console.log(`Found: ${fullPath}`);
            }
        }
    }
}

console.log("Searching for 'business-status' file...");
findFile('.', 'business-status');
console.log("Search completed.");
