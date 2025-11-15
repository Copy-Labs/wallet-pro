const fs = require('fs');
const path = require('path');

function fixUnderscoreFiles(buildDir) {
  const filesToRename = [];

  // Find all files starting with underscore
  function scanDirectory(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (item.startsWith('_')) {
        filesToRename.push({
          oldPath: fullPath,
          oldName: item,
          newName: 'u' + item.substring(1), // Replace _ with u
          newPath: path.join(dir, 'u' + item.substring(1))
        });
      }
    }
  }

  console.log(`Scanning ${buildDir} for underscore-prefixed files...`);
  scanDirectory(buildDir);

  if (filesToRename.length === 0) {
    console.log('No underscore-prefixed files found.');
    return;
  }

  console.log(`Found ${filesToRename.length} files to rename:`);
  filesToRename.forEach(file => console.log(`  ${file.oldName} -> ${file.newName}`));

  // Rename files
  for (const file of filesToRename) {
    console.log(`Renaming ${file.oldName} -> ${file.newName}`);
    fs.renameSync(file.oldPath, file.newPath);
  }

  // Update references in all files
  function updateReferences(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        updateReferences(fullPath);
      } else if (item.endsWith('.json') || item.endsWith('.js') || item.endsWith('.html') || item.endsWith('.css')) {
        let content = fs.readFileSync(fullPath, 'utf8');
        let changed = false;

        for (const file of filesToRename) {
          if (content.includes(file.oldName)) {
            content = content.replace(new RegExp(file.oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), file.newName);
            changed = true;
          }
        }

        if (changed) {
          fs.writeFileSync(fullPath, content);
          console.log(`Updated references in ${path.relative(buildDir, fullPath)}`);
        }
      }
    }
  }

  console.log('Updating file references...');
  updateReferences(buildDir);

  console.log(`✅ Fixed ${filesToRename.length} underscore-prefixed files`);
}

const buildDir = process.argv[2] || './build/chrome-mv3-prod';

// Fix both dev and prod directories if they exist
const directories = [
  './build/chrome-mv3-dev',
  './build/chrome-mv3-prod'
];

directories.forEach(dir => {
  try {
    fixUnderscoreFiles(dir);
  } catch (error) {
    console.log(`Directory ${dir} does not exist, skipping...`);
  }
});
