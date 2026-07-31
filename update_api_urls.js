const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend/src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(srcDir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  if (content.includes('http://localhost:5001/api') || content.includes('http://localhost:5001')) {
    // Determine relative path to config.ts
    const relativePathToSrc = path.relative(path.dirname(file), srcDir);
    const configImportPath = relativePathToSrc ? `${relativePathToSrc}/config` : './config';
    
    if (file.includes('SocketContext')) {
      content = content.replace(/'http:\/\/localhost:5001'/g, "SOCKET_URL");
      content = `import { SOCKET_URL } from '${configImportPath}';\n` + content;
    } else {
      // For API URL
      if (!content.includes('import { API_URL }')) {
        content = `import { API_URL } from '${configImportPath}';\n` + content;
      }
      
      // Replace instances of 'http://localhost:5001/api...'
      content = content.replace(/'http:\/\/localhost:5001\/api/g, "`\${API_URL}");
      // For any that are already template literals
      content = content.replace(/http:\/\/localhost:5001\/api/g, "${API_URL}");
      
      // Clean up cases where we had 'http://localhost:5001/api/some/path'
      // By changing ' to ` at the end of the string. We will just use regex to fix the closing quote.
      content = content.replace(/`\$\{API_URL\}([^']*)'/g, "`\${API_URL}$1`");
    }
    
    if (content !== originalContent) {
      fs.writeFileSync(file, content);
      console.log('Updated', file);
    }
  }
});
