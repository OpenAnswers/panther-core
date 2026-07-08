import path from 'path';
import { defineConfig } from 'vite';

import { concatImports } from './vite-plugin-concat';

// Frontend asset bundler replacing connect-assets + grunt.
//
// Run: vite build             — production build
//      vite build --watch     — development rebuild on change

export default defineConfig({
  root: '.',
  publicDir: false,
  plugins: [concatImports()],

  build: {
    outDir: 'public/assets/bld',
    emptyOutDir: true,
    manifest: true,
    sourcemap: process.env.NODE_ENV !== 'production',
    minify: process.env.NODE_ENV === 'production',
    // Our supported browsers (modern Chrome/FF/Safari/Edge) already implement
    // every syntax feature we use — tell esbuild not to down-transpile. This
    // also sidesteps esbuild 0.27+ refusing to lower some edge cases when the
    // default 'modules' target implies overrides.
    target: 'es2022',

    rollupOptions: {
      input: {
        // jQuery global — must be first entry so window.jQuery is set
        // before Bootstrap and other jQuery plugins load
        jquery_global: 'app/assets/js/_jquery-global.ts',
        // Vendor bundle — third-party libraries (jQuery plugins, Bootstrap, etc.)
        vendor: 'app/assets/js/_vendor.ts',
        // Shared app utilities — loaded on every page after vendor
        scripts: 'app/assets/js/_scripts.ts',
        // Section bundles
        console: 'app/assets/js/console.ts',
        admin: 'app/assets/js/admin.ts',
        charts: 'app/assets/js/charts.ts',
        dashboard: 'app/assets/js/dashboard.ts',
        rules_mgmt: 'app/assets/js/_rules-management.ts',
        // Page-specific bundles
        login: 'app/assets/js/login.ts',
        apiconsole: 'app/assets/js/apiconsole.ts',
        import_export: 'app/assets/js/import-export.ts',
        schedules: 'app/assets/js/schedules.ts',
        refresh: 'app/assets/js/refresh.ts',
        rules: 'app/assets/js/rules.ts',
        rules_syslog: 'app/assets/js/rules-syslog.ts',
        views: 'app/assets/js/views.ts',
        debug_raw_stream: 'app/assets/js/debug-raw-stream.ts',
        signup: 'app/assets/js/signup-signup.ts',
        contextmenu: 'app/assets/js/contextmenu.ts',
        widget_activity: 'app/assets/js/widget-activity-stream.ts',
        widget_summary: 'app/assets/js/widget-summary-stream.ts',
        widget_inventory: 'app/assets/js/widget-inventory-stream.ts',
        event: 'app/assets/js/event.ts',
        // CSS bundles
        global_css: 'app/assets/css/global.less',
        console_css: 'app/assets/css/console.less',
        dashboard_css: 'app/assets/css/dashboard.less',
        rules_css: 'app/assets/css/rules.less',
        rules_mgmt_css: 'app/assets/css/rules-management.less',
        generic_css: 'app/assets/css/generic.less',
        index_css: 'app/assets/css/index.less',
        onboarding_css: 'app/assets/css/onboarding.less',
        schedules_css: 'app/assets/css/schedules.less',
        contextmenu_css: 'app/assets/css/contextmenu.less',
        w2ui_css: 'app/assets/css/w2ui.less',
      },
      output: {
        // Keep entry chunk names predictable for the manifest helper
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: assetInfo => {
          if (assetInfo.name?.endsWith('.css')) return 'css/[name]-[hash].css';
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },

  css: {
    preprocessorOptions: {
      less: {
        // Allow @import to resolve from these directories without relative paths
        paths: [
          path.resolve(__dirname, 'app/assets'),
          path.resolve(__dirname, 'app/assets/css'),
          path.resolve(__dirname, 'app/assets/oa_less'),
          path.resolve(__dirname, 'app/assets/bootstrap_less'),
          path.resolve(__dirname, 'app/assets/w2ui_less'),
        ],
      },
    },
  },

  resolve: {
    alias: {
      // Map bare module names to pre-built browser bundles from npm so
      // frontend code can `import 'jquery'` and get the UMD/browser build.
      jquery: require.resolve('jquery/dist/jquery.js'),
      bootstrap: require.resolve('bootstrap/dist/js/bootstrap.js'),
      lodash: require.resolve('lodash/lodash.js'),
      bluebird: require.resolve('bluebird/js/browser/bluebird.js'),
      mustache: require.resolve('mustache/mustache.js'),
      clipboard: require.resolve('clipboard/dist/clipboard.js'),
      urijs: require.resolve('urijs/src/URI.js'),
    },
  },
});
