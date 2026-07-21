const { execSync } = require('child_process');
try {
  const diff = execSync('git diff HEAD -- src/app/admin/misiones/page.tsx', { cwd: 'd:\\Documentos\\antigravity\\spa\\Spa' }).toString();
  const lines = diff.split('\n');
  console.log("Diff lines count:", lines.length);
  console.log("FIRST 120 lines of Diff:");
  console.log(lines.slice(0, 120).join('\n'));
} catch (e) {
  console.error("Error running git diff:", e.message);
}
