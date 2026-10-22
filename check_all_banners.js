async function testBanners(slug) {
  const r = await fetch(`http://localhost:3000/${slug}`);
  const html = await r.text();
  const re = /<img[^>]+src=["']([^"']+)["'][^>]*alt=["'](Banner[^"']*)["']/g;
  let match;
  console.log(`\n--- Banners en ${slug} ---`);
  let count = 0;
  while ((match = re.exec(html)) !== null) {
    count++;
    const src = match[1];
    const alt = match[2];
    const fullUrl = src.startsWith('http') ? src : `http://localhost:3000${src}`;
    const res = await fetch(fullUrl);
    console.log(`${res.status} | [${alt}] -> ${src}`);
  }
  if (count === 0) console.log('Sin banners con alt Banner o usa otro layout');
}

async function run() {
  await testBanners('dentarmony');
  await testBanners('demo-canchas');
  await testBanners('bubblewashuio');
}
run().catch(console.error);
