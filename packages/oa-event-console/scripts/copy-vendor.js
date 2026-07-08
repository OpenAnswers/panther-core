#!/usr/bin/env node
//
// Copies pre-built vendor files from vendor-src/ and a couple of local assets
// into public/assets/vendor/ and public/assets/css/ so they can be served as
// static assets alongside the Vite-built bundles.
//

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const vendorDir = path.join(root, 'public', 'assets', 'vendor');
const cssDir = path.join(root, 'public', 'assets', 'css');
const fontDir = path.join(root, 'public', 'font');

fs.mkdirSync(vendorDir, { recursive: true });
fs.mkdirSync(cssDir, { recursive: true });
fs.mkdirSync(fontDir, { recursive: true });

const vendorCopies = [
  // w2ui — kept as standalone (too complex to bundle with Vite)
  ['app/assets/js/w2ui.js', 'w2ui.js'],
  // d3 v3 — pinned via npm but copied as a plain <script> because
  // d3 v3's `this.document` / `this.d3 = d3` pattern breaks in ES module strict mode
  [require.resolve('d3/d3.js'), 'd3.js'],
  // jQuery UI — pinned via npm but copied as a plain <script> because
  // v1.14 ships AMD-only UMD that does not register widgets under Rollup
  [require.resolve('jquery-ui/dist/jquery-ui.min.js'), 'jquery-ui.js'],
];

// Plain CSS files served statically (no LESS compilation — use absolute /font/ paths)
const cssCopies = [
  ['app/assets/css/font_roboto_regular.css', 'font_roboto_regular.css'],
  ['app/assets/css/font_source_sans_pro_regular.css', 'font_source_sans_pro_regular.css'],
];

// Bootstrap Glyphicons fonts — referenced by bootstrap's glyphicons.less via
// `@icon-font-path: '/font/'`, so they must be present at public/font/.
const bootstrapFontsDir = path.dirname(require.resolve('bootstrap/dist/fonts/glyphicons-halflings-regular.woff'));
const fontCopies = [
  'glyphicons-halflings-regular.eot',
  'glyphicons-halflings-regular.svg',
  'glyphicons-halflings-regular.ttf',
  'glyphicons-halflings-regular.woff',
  'glyphicons-halflings-regular.woff2',
].map(name => [path.join(bootstrapFontsDir, name), name]);

let copied = 0;

for (const [src, dest] of vendorCopies) {
  const srcPath = path.isAbsolute(src) ? src : path.join(root, src);
  const destPath = path.join(vendorDir, dest);
  if (!fs.existsSync(srcPath)) {
    console.warn(`Warning: ${src} not found, skipping.`);
    continue;
  }
  fs.copyFileSync(srcPath, destPath);
  console.log(`  ${src} → public/assets/vendor/${dest}`);
  copied++;
}

for (const [src, dest] of cssCopies) {
  const srcPath = path.join(root, src);
  const destPath = path.join(cssDir, dest);
  if (!fs.existsSync(srcPath)) {
    console.warn(`Warning: ${src} not found, skipping.`);
    continue;
  }
  fs.copyFileSync(srcPath, destPath);
  console.log(`  ${src} → public/assets/css/${dest}`);
  copied++;
}

for (const [srcPath, dest] of fontCopies) {
  const destPath = path.join(fontDir, dest);
  if (!fs.existsSync(srcPath)) {
    console.warn(`Warning: ${srcPath} not found, skipping.`);
    continue;
  }
  fs.copyFileSync(srcPath, destPath);
  console.log(`  ${srcPath} → public/font/${dest}`);
  copied++;
}

console.log(`Done. Copied ${copied} file(s).`);
