const fs = require('fs-extra');

const START_PATH = 'build/hooks/pre-commit';
const FINAL_PATH = '.git/hooks/pre-commit';

// Skip if we have done this already
if (fs.existsSync(FINAL_PATH)) {
  process.exit(0);
}

// Copy hook
console.log('Installing pre-commit hook');
fs.copyFileSync(START_PATH, FINAL_PATH);
