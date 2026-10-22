import fs from 'fs';

const data = JSON.parse(fs.readFileSync('audit_api_routes.json', 'utf8'));
const relevant = data.filter((r: any) => 
    r.touchesInventory || 
    r.touchesProduction || 
    r.touchesTransfer || 
    r.route.includes('invent') || 
    r.route.includes('product') || 
    r.route.includes('recet') || 
    r.route.includes('producci') || 
    r.route.includes('branch') || 
    r.route.includes('wareh') || 
    r.route.includes('bodega') || 
    r.route.includes('sucursal')
);

console.log('Total relevant routes:', relevant.length);
for (const r of relevant) {
    console.log(
        '[' + r.methods.join(',') + '] ' + 
        r.route + 
        ' (Auth: ' + r.hasAuth + 
        ', InvEngine: ' + r.usesInventoryEngine + 
        ', ProdEngine: ' + r.usesProductionEngine + ')'
    );
}

fs.writeFileSync('audit_api_routes_relevant.json', JSON.stringify(relevant, null, 2));
