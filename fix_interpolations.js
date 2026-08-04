const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('src');
let fixedCount = 0;
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('\\${')) {
    // Regex to match a literal backslash followed by ${
    const newContent = content.replace(/\\\$\{/g, '${');
    fs.writeFileSync(file, newContent, 'utf8');
    fixedCount++;
    console.log('Fixed ' + file);
  }
});
console.log('Total fixed: ' + fixedCount);
