import fs from 'fs';
import crypto from 'crypto';

const file = 'dev.db';
const buf = fs.readFileSync(file);
const hash = crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
console.log('dev.db size:', buf.length);
console.log('dev.db SHA256:', hash);

const EXPECTED_BEFORE = '190B1EDDA51E135A09D2EAFD74503B3A32AEC55B549F6D7582C9780043DA32D3';
if (hash === EXPECTED_BEFORE) {
    console.log('HASH MATCH 100%: dev.db is 100% INTACT AND UNMODIFIED.');
} else {
    console.error('HASH MISMATCH! dev.db was altered!');
}
