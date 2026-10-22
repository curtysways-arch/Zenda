async function run() {
  const r = await fetch('http://localhost:3000/symechas-peluquera');
  const html = await r.text();
  const re = /<img[^>]+src=["']([^"']+)["'][^>]*alt=["'](Banner[^"']*)["']/g;
  let match;
  console.log('--- Comprobando Banners del Hero en Symechas ---');
  while ((match = re.exec(html)) !== null) {
    const src = match[1];
    const alt = match[2];
    const fullUrl = src.startsWith('http') ? src : `http://localhost:3000${src}`;
    const res = await fetch(fullUrl);
    console.log(`${res.status} | [${alt}] -> ${src}`);
  }
}
run().catch(console.error);
