#!/usr/bin/env node
//
// Extracts font zip archives from public/ into public/font/.
// Replaces the grunt-zip font extraction task.
// Safe to run multiple times — skips if fonts already present.
//

const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '../public');
const fontDir = path.join(publicDir, 'font');
const zips = ['roboto.zip', 'source-sans-pro.zip', 'lato2.zip'];

// Skip if font directory already has content
if (fs.existsSync(fontDir) && fs.readdirSync(fontDir).length > 0) {
  console.log('Fonts already extracted.');
  process.exit(0);
}

fs.mkdirSync(fontDir, { recursive: true });

let extracted = 0;
for (const zipName of zips) {
  const zipPath = path.join(publicDir, zipName);
  if (!fs.existsSync(zipPath)) {
    console.warn(`Warning: ${zipName} not found at ${zipPath}, skipping.`);
    continue;
  }
  console.log(`Extracting ${zipName}...`);
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(fontDir, true);
  extracted++;
}

if (extracted > 0) {
  console.log(`Done. Extracted ${extracted} archive(s) to ${fontDir}`);
} else {
  console.warn('No font archives were extracted.');
}
