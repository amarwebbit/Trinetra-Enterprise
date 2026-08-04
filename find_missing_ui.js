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
let missing = new Set();
const existing = new Set(fs.readdirSync('src/components/ui').map(f => f.replace('.tsx', '')));
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.match(/from ['"]@\/components\/ui\/([^'"]+)['"]/g);
  if (matches) {
    matches.forEach(m => {
      const comp = m.replace(/from ['"]@\/components\/ui\//, '').replace(/['"]$/, '');
      if (!existing.has(comp)) {
        missing.add(comp);
      }
    });
  }
});
console.log(Array.from(missing).join(' '));
