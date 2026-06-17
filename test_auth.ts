const bcrypt = require('bcryptjs');

async function test() {
    const hash = '$2b$10$miI7AjVeLti3ynZtqYf/X.rtm82jJudeMawU4lAbJx4HjuujXcc5G';
    const pass = 'admin123';
    const match = await bcrypt.compare(pass, hash);
    console.log('Match:', match);
}

test();
