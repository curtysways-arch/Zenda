import fs from 'fs';
import path from 'path';

function findRoutes(dir: string, base: string = ''): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(findRoutes(fullPath, path.join(base, file)));
        } else if (file === 'route.ts' || file === 'route.js') {
            results.push(path.join(base, file));
        }
    }
    return results;
}

const apiDir = path.join(process.cwd(), 'src', 'app', 'api');
const routes = findRoutes(apiDir);

const allRoutes: any[] = [];

for (const r of routes) {
    const full = path.join(apiDir, r);
    const content = fs.readFileSync(full, 'utf8');
    const methods: string[] = [];
    if (/export\s+async\s+function\s+GET/i.test(content)) methods.push('GET');
    if (/export\s+async\s+function\s+POST/i.test(content)) methods.push('POST');
    if (/export\s+async\s+function\s+PUT/i.test(content)) methods.push('PUT');
    if (/export\s+async\s+function\s+PATCH/i.test(content)) methods.push('PATCH');
    if (/export\s+async\s+function\s+DELETE/i.test(content)) methods.push('DELETE');
    
    const touchesInventory = /InventoryEngine|InventoryMovement|WarehouseStock|BranchInventory|\.stock/i.test(content);
    const touchesProduction = /ProductionEngine|ProductionOrder|Recipe/i.test(content);
    const touchesTransfer = /InventoryTransfer|transfer/i.test(content);
    const hasAuth = /getServerSession|authOptions|getAuth/i.test(content);
    const routePath = '/api/' + r.replace(/\\/g, '/').replace(/\/route\.(ts|js)$/, '');

    allRoutes.push({
        route: routePath,
        file: r.replace(/\\/g, '/'),
        methods,
        touchesInventory,
        touchesProduction,
        touchesTransfer,
        hasAuth,
        usesInventoryEngine: content.includes('InventoryEngine'),
        usesProductionEngine: content.includes('ProductionEngine')
    });
}

fs.writeFileSync('audit_api_routes.json', JSON.stringify(allRoutes, null, 2));
console.log('Audited', allRoutes.length, 'routes successfully.');
