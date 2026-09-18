const fs = require('fs');

const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Find all models
const models = [];
const enums = [];
const lines = schema.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.startsWith('model ')) {
    const name = line.split(/\s+/)[1];
    models.push(name);
  } else if (line.startsWith('enum ')) {
    const name = line.split(/\s+/)[1];
    enums.push(name);
  }
}

console.log('=== ALL MODELS (' + models.length + ') ===');
console.log(models.sort().join(', '));

console.log('\n=== ALL ENUMS (' + enums.length + ') ===');
console.log(enums.sort().join(', '));

// Search for keywords in models
const keywords = [
  'attendance', 'access', 'member', 'plan', 'gym', 'class', 'schedule', 'enrollment', 'trainer', 'staff', 'customer', 'user', 'branch', 'business'
];

console.log('\n=== MATCHING MODELS ===');
models.forEach(m => {
  const lower = m.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw)) {
      console.log(`- ${m} (matches keyword: ${kw})`);
      break;
    }
  }
});
