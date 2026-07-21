const fs = require('fs');
try {
  const content = fs.readFileSync('d:\\Documentos\\antigravity\\spa\\Spa\\tmp_schema.prisma', 'utf16le');
  console.log("UTF16LE content first 300 chars:");
  console.log(content.substring(0, 300));
} catch (e) {
  console.log("Error reading as UTF-16LE:", e.message);
  try {
    const contentUtf8 = fs.readFileSync('d:\\Documentos\\antigravity\\spa\\Spa\\tmp_schema.prisma', 'utf8');
    console.log("UTF8 content first 300 chars:");
    console.log(contentUtf8.substring(0, 300));
  } catch (e2) {
    console.log("Error reading as UTF-8:", e2.message);
  }
}
