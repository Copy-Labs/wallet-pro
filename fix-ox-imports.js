const fs = require('fs');
const path = require('path');

function fixImports(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      fixImports(fullPath);
    } else if (file.name.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const originalContent = content;

      // Replace .js' with ' in import statements
      content = content.replace(/\.js'/g, "'");

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content);
        console.log(`Fixed: ${fullPath}`);
      }
    }
  }
}

// Find ox package directories
const oxDirs = require('fs').readdirSync('node_modules/.pnpm', { withFileTypes: true })
  .filter(dir => dir.name.startsWith('ox@'))
  .map(dir => `node_modules/.pnpm/${dir.name}/node_modules/ox`);

oxDirs.forEach(dir => {
  if (require('fs').existsSync(dir)) {
    console.log(`Fixing imports in: ${dir}`);
    fixImports(dir);
  }
});

console.log('Done fixing ox imports');
