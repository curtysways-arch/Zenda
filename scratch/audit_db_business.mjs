import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  const cmd = `
    echo "=== 1. DATOS DE NEGOCIO (SYMECHAS vs PINCHOS) ==="
    PGPASSWORD="CitioxProd2024!" psql -U zenda_user -h 127.0.0.1 -d zenda_db -c '
      SELECT id, nombre, slug, "tipoNegocio", "businessTypeId", "businessProfileId" 
      FROM "Negocio" 
      WHERE slug IN ('"'"'symechas-peluquera'"'"', '"'"'pinchos'"'"');
    '

    echo ""
    echo "=== 2. TABLA BusinessType Y BusinessProfile ==="
    PGPASSWORD="CitioxProd2024!" psql -U zenda_user -h 127.0.0.1 -d zenda_db -c '
      SELECT * FROM "BusinessType";
    ' 2>&1
    PGPASSWORD="CitioxProd2024!" psql -U zenda_user -h 127.0.0.1 -d zenda_db -c '
      SELECT * FROM "BusinessProfile";
    ' 2>&1

    echo ""
    echo "=== 3. CONFIGURACION DE AMBOS NEGOCIOS ==="
    PGPASSWORD="CitioxProd2024!" psql -U zenda_user -h 127.0.0.1 -d zenda_db -c '
      SELECT "negocioId", clave, valor FROM "Configuracion" 
      WHERE "negocioId" IN (
        SELECT id FROM "Negocio" WHERE slug IN ('"'"'symechas-peluquera'"'"', '"'"'pinchos'"'"')
      );
    ' 2>&1
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = "";
    stream.on("data", (d) => { out += d; process.stdout.write(d); });
    stream.stderr.on("data", (d) => { out += d; });
    stream.on("close", () => conn.end());
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
