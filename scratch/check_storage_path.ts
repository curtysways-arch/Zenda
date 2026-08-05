import fs from 'fs';
import path from 'path';

function checkStorage() {
  const storageDir = path.resolve(process.cwd(), 'storage', 'uploads');
  console.log("=== COMPROBANDO DIRECTORIO STORAGE DE MEDIOS ===");
  console.log("STORAGE_PATH:", storageDir);
  console.log("¿Existe STORAGE_PATH?:", fs.existsSync(storageDir));

  if (fs.existsSync(storageDir)) {
    const listFiles = (dir: string): string[] => {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat && stat.isDirectory()) {
          results = results.concat(listFiles(full));
        } else {
          results.push(full);
        }
      });
      return results;
    };
    const files = listFiles(storageDir);
    console.log(`Archivos almacenados (${files.length}):`);
    files.forEach(f => console.log(` - ${f}`));
  }
}

checkStorage();
