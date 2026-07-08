//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
//
// Vite manifest reader for Express.
// Replaces the connect-assets js() and css() locals.
//
// After `vite build`, reads public/assets/bld/.vite/manifest.json and exposes
// js(name) and css(name) helpers that return HTML <script>/<link> tags with
// the correct hashed filenames for cache-busting.
//
// Register on app.locals in lib/express.ts:
//   const { js, css } = buildAssetHelpers()
//   app.locals.js = js
//   app.locals.css = css
//
// Use in Pug templates:
//   != js('vendor')
//   != css('global_css')
//

import path from 'path'
import fs from 'fs'

const MANIFEST_PATH = path.join(process.cwd(), 'public/assets/bld/.vite/manifest.json')
const PUBLIC_BASE = '/assets/bld'

type ManifestEntry = {
  file: string
  name?: string
  src?: string
  isEntry?: boolean
  css?: string[]
  imports?: string[]
}

type Manifest = Record<string, ManifestEntry>

let cachedManifest: Manifest | null = null
let cachedIndex: Record<string, ManifestEntry> | null = null

function loadManifest(): Manifest {
  if (cachedManifest && process.env.NODE_ENV === 'production') {
    return cachedManifest
  }
  if (!fs.existsSync(MANIFEST_PATH)) {
    cachedManifest = null
    cachedIndex = null
    return {}
  }
  cachedManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) as Manifest
  // Build name → entry index
  cachedIndex = {}
  for (const entry of Object.values(cachedManifest)) {
    if (entry.name) {
      cachedIndex[entry.name] = entry
    } else if (entry.file?.endsWith('.css')) {
      // CSS-only entries don't get a `name` in the manifest — extract it from the filename.
      // e.g. "css/global_css-oF-66Pue.css" → "global_css"
      const basename = path.basename(entry.file, '.css')
      const name = basename.replace(/-[A-Za-z0-9_-]{8,}$/, '')
      if (name) cachedIndex[name] = entry
    }
  }
  return cachedManifest
}

function findEntry(name: string): ManifestEntry | null {
  loadManifest()
  return cachedIndex?.[name] ?? null
}

export function buildAssetHelpers() {
  function js(name: string): string {
    const entry = findEntry(name)
    if (!entry) {
      return `<!-- asset '${name}' not found in Vite manifest -->`
    }
    return `<script type="module" src="${PUBLIC_BASE}/${entry.file}"></script>`
  }

  function css(name: string): string {
    const entry = findEntry(name)
    if (!entry) {
      return `<!-- css '${name}' not found in Vite manifest -->`
    }
    // CSS-only entry: `file` IS the compiled CSS file
    if (entry.file?.endsWith('.css')) {
      return `<link rel="stylesheet" href="${PUBLIC_BASE}/${entry.file}">`
    }
    // JS entry with associated CSS chunks (code-split)
    if (entry.css && entry.css.length > 0) {
      return entry.css
        .map(f => `<link rel="stylesheet" href="${PUBLIC_BASE}/${f}">`)
        .join('\n')
    }
    return `<!-- css '${name}' not found in Vite manifest -->`
  }

  return { js, css }
}
