/**
 * Crea páginas personalizadas de ejemplo (publicadas) en los negocios DEMO,
 * usando las plantillas de src/lib/pageTemplates.ts según el tipo de cada negocio.
 * No toca páginas existentes: si una plantilla ya existe (mismo slug), la salta.
 *
 * Uso (desde la carpeta del proyecto):
 *   npx tsx scripts/crear-paginas-demo.ts --dry          → solo muestra qué haría
 *   npx tsx scripts/crear-paginas-demo.ts                → crea en todos los demos
 *   npx tsx scripts/crear-paginas-demo.ts --slug demo-spa → solo en ese negocio (demo o no)
 */
// La base se toma de DATABASE_URL (.env). Si no está definida, se usa ./dev.db.
try { (process as any).loadEnvFile?.('.env'); } catch { /* sin .env: se usa el valor por defecto */ }

import prisma from '../src/lib/prisma';
import { detectPageKind, templatesFor, fillTemplate } from '../src/lib/pageTemplates';
import { slugifyPageTitle } from '../src/lib/customPages';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const slugArg = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : null;

async function main() {
  const negocios = await prisma.negocio.findMany({
    where: slugArg ? { slug: slugArg } : ({ isDemo: true } as any),
    select: { id: true, nombre: true, slug: true, tipoNegocio: true, configuracion: true },
    orderBy: { slug: 'asc' },
  });
  if (!negocios.length) {
    console.log(slugArg ? `No existe el negocio "${slugArg}".` : 'No hay negocios demo.');
    return;
  }

  let total = 0;
  for (const n of negocios) {
    const kind = detectPageKind(n);
    const existing = await prisma.page.findMany({ where: { businessId: n.id }, select: { slug: true, orden: true } });
    const used = new Set(existing.map((p) => p.slug));
    let orden = existing.reduce((m, p) => Math.max(m, p.orden ?? 0), 0);
    const todo = templatesFor(kind).filter((t) => !used.has(slugifyPageTitle(t.title)));

    console.log(`\n${n.nombre} (${n.slug}) · tipo: ${kind} · ya tiene ${existing.length} página(s)`);
    if (!todo.length) { console.log('  Nada que crear.'); continue; }

    for (const t of todo) {
      const slug = slugifyPageTitle(t.title);
      console.log(`  ${dry ? '[simulación] ' : ''}+ ${t.title}  →  /${n.slug}/pagina/${slug}`);
      if (dry) continue;
      const now = new Date();
      orden += 1;
      await prisma.page.create({
        data: {
          id: `cm${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`,
          businessId: n.id,
          title: t.title,
          slug,
          contentHtml: fillTemplate(t.html, { negocio: n.nombre }),
          buttonText: t.buttonText || null,
          buttonUrl: t.buttonUrl || null,
          status: 'published',
          posicion: t.posicion,
          orden,
          createdAt: now,
          updatedAt: now,
        },
      });
      total += 1;
    }
  }
  console.log(dry ? '\nSimulación terminada: no se guardó nada.' : `\nListo: ${total} página(s) creadas.`);
}

main()
  .catch((e) => { console.error('Error:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
