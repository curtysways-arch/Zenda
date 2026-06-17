import fs from 'fs';
import path from 'path';

function removeDir(dir: string) {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`Deleted ${dir}`);
    } else {
        console.log(`${dir} not found`);
    }
}

console.log("Stopping process and clearing cache...");
setTimeout(() => {
    try {
        removeDir(path.join(process.cwd(), '.next'));
        console.log("Successfully cleared .next cache!");
    } catch (e) {
        console.error("Failed to clear cache:", e);
    }
}, 1000);
