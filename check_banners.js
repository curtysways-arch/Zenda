const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.imagen.findMany({orderBy:{createdAt:'desc'},take:10}).then(r => {
  console.log(JSON.stringify(r.map(i=>({
    id: i.id.slice(0,8),
    tipo: i.tipo,
    esBanner: i.esBanner,
    url: i.url.slice(0,60)
  })),null,2));
  return p.$disconnect();
}).catch(e=>{console.error(e); return p.$disconnect();});
