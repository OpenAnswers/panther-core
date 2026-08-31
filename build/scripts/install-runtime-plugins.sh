#!/bin/sh

panther_install_runtime_plugins() {
  if [ -z "${PANTHER_PLUGIN_INSTALL:-}" ]; then
    return 0
  fi

  plugin_dir=${PANTHER_PLUGIN_DIR:-/tmp/panther-plugins}
  mkdir -p "$plugin_dir"

  if [ ! -f "$plugin_dir/package.json" ]; then
    cat > "$plugin_dir/package.json" <<'EOF'
{
  "name": "panther-runtime-plugins",
  "private": true
}
EOF
  fi

  PLUGIN_DIR="$plugin_dir" node <<'EOF'
const { spawnSync } = require('child_process');

const raw = process.env.PANTHER_PLUGIN_INSTALL || '[]';
let specs;

try {
  specs = JSON.parse(raw);
} catch (error) {
  console.error('PANTHER_PLUGIN_INSTALL must be a JSON array of npm package specs');
  console.error(error.message);
  process.exit(1);
}

if (!Array.isArray(specs)) {
  console.error('PANTHER_PLUGIN_INSTALL must be a JSON array of npm package specs');
  process.exit(1);
}

const cleanedSpecs = specs.map((spec) => {
  if (typeof spec !== 'string' || spec.trim() === '') {
    console.error('Each PANTHER_PLUGIN_INSTALL entry must be a non-empty string');
    process.exit(1);
  }
  return spec.trim();
});

if (cleanedSpecs.length === 0) process.exit(0);

const result = spawnSync(
  'npm',
  ['install', '--omit=dev', '--no-save', '--prefix', process.env.PLUGIN_DIR, ...cleanedSpecs],
  { stdio: 'inherit' }
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status == null ? 1 : result.status);
EOF

  export NODE_PATH="$plugin_dir/node_modules${NODE_PATH:+:$NODE_PATH}"
}

panther_install_runtime_plugins
