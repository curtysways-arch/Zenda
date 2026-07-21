const { execSync } = require('child_process');
try {
  const diff = execSync('git diff HEAD -- src/app/admin/misiones/page.tsx', { cwd: 'd:\\Documentos\\antigravity\\spa\\Spa' }).toString();
  const lines = diff.split('\n');
  console.log("Diff lines from 120 to 300:");
  console.log(lines.slice(120, 300).join('\n'));
} catch (e) {
  console.error("Error running git diff:", e.message);
}
