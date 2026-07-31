const fs = require('fs');
let c = fs.readFileSync('src/utils/seed.ts', 'utf8');
c = c.replace(/\\\\'/g, "'");
fs.writeFileSync('src/utils/seed.ts', c);
