const { execSync } = require('child_process');
try {
  const diff = execSync('git diff HEAD -- src/app/admin/misiones/page.tsx', { cwd: 'd:\\Documentos\\antigravity\\spa\\Spa' }).toString();
  console.log(diff);
} catch (e) {
  console.error("Error running git diff:", e.message);
}
