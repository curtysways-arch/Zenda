import fs from 'fs';
import path from 'path';

function findPages(dir: string, base: string = ''): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(findPages(fullPath, path.join(base, file)));
        } else if (file === 'page.tsx' || file === 'page.jsx') {
            results.push(path.join(base, file));
        }
    }
    return results;
}

const adminDir = path.join(process.cwd(), 'src', 'app', 'admin');
const pages = findPages(adminDir);
console.log('Total admin pages:', pages.length);

const results: any[] = [];
for (const p of pages) {
    const full = path.join(adminDir, p);
    const content = fs.readFileSync(full, 'utf8');
    const route = '/admin/' + p.replace(/\\/g, '/').replace(/\/page\.(tsx|jsx)$/, '');
    results.push({
        route,
        file: p.replace(/\\/g, '/'),
        hasBranchFilter: /branch|sucursal/i.test(content),
        hasWarehouseFilter: /warehouse|bodega/i.test(content),
        hasProduction: /producci[oó]n|receta|recipe|orden/i.test(content),
        hasTransfer: /transfer|tr[aá]nsito/i.test(content),
        hasPMP: /pmp|costo.*promedio/i.test(content)
    });
}

fs.writeFileSync('audit_admin_pages.json', JSON.stringify(results, null, 2));

const inventoryRelevant = results.filter(r => 
    r.route.includes('invent') || 
    r.route.includes('product') || 
    r.route.includes('recet') || 
    r.route.includes('producci') || 
    r.route.includes('transfer') || 
    r.route.includes('bodega') || 
    r.route.includes('sucursal')
);

console.log('Relevant admin UI pages:');
for (const r of inventoryRelevant) {
    console.log(r.route + ' -> Branch:' + r.hasBranchFilter + ', Wh:' + r.hasWarehouseFilter + ', PMP:' + r.hasPMP);
}
