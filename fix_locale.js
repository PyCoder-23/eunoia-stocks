const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('frontend/src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace toLocaleString(undefined, with toLocaleString('en-IN',
  content = content.replace(/\.toLocaleString\(\s*undefined\s*,/g, ".toLocaleString('en-IN',");
  
  // Replace toLocaleString() with toLocaleString('en-IN')
  content = content.replace(/\.toLocaleString\(\s*\)/g, ".toLocaleString('en-IN')");
  
  fs.writeFileSync(file, content);
});
console.log('Replaced toLocaleString in all TSX files');
