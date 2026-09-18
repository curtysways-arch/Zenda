const fs = require('fs');
const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

function printModel(modelName) {
  const regex = new RegExp(`model\\s+${modelName}\\s+{[^}]+}`, 'g');
  const match = schema.match(regex);
  if (match) {
    console.log(`=== MODEL ${modelName} ===`);
    console.log(match[0]);
  } else {
    console.log(`Model ${modelName} not found`);
  }
}

['Cliente', 'Usuario', 'Payment', 'Branch', 'AdminAuditLog', 'DomainEvent'].forEach(printModel);
