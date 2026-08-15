# Panther Plugin Extensions

This repository now supports config-driven extension packages for the event server and event console.

The important constraint is package resolution, not repository layout. A plugin does not need to live under `packages/` as long as the relevant Panther process can `require()` it by package name.

## Overview

Panther loads plugins separately in each service:

- `oa-event-server` reads `plugins` from `packages/oa-event-server/etc/server.ini`.
- `oa-event-console` reads `plugins` from `packages/oa-event-console/config.yml`.

Each plugin entry names an npm package and can optionally point to a plugin-specific config file.

Installing a plugin package is not enough on its own. Panther only loads plugins that are explicitly listed in the service config for the process that should use them:

- add the plugin to `packages/oa-event-console/config.yml` if the console should load it
- add the plugin to `packages/oa-event-server/etc/server.ini` if the server should load it
- add it to both only when the plugin participates in both services

Server config:

```ini
plugins = [{"package":"panther-example-plugin","config":"../../etc/panther-example-plugin.yml"}]
```

Console config:

```yaml
plugins:
  - package: panther-example-plugin
    config: ../../etc/panther-example-plugin.yml
```

The `config` path is passed into the plugin's `configure()` function. If the plugin resolves it with `path.resolve(process.cwd(), configFile)`, paths are relative to the service process working directory:

- local source runs: the package directory for that service
- Docker images: `/app`

## Plugin Contract

Panther accepts either of these module shapes:

```js
module.exports = {
  name: 'my-plugin',
  applyServer(context, cb) {},
  applyConsole(context) {},
  applyConsoleAuth(context) {},
};
```

```js
module.exports.configure = function configure({ configFile, packageName }) {
  return {
    name: packageName || 'my-plugin',
    applyServer(context, cb) {},
    applyConsole(context) {},
    applyConsoleAuth(context) {},
  };
};
```

Only the hooks you implement are called.

## Naming Convention

Use plugin package names that start with `panther-`.

Recommended format:

- `panther-<capability>` for a single-purpose extension
- `panther-<vendor>-<capability>` when the package is organization-specific

Examples:

- `panther-oidc-auth`
- `panther-acme-ticketing`
- `panther-custom-fields`

## Hook Points

### `applyServer(context, cb)`

Loaded by `oa-event-server` during startup, after the built-in alert definitions are loaded and before the Mongoose alert schema is registered.

Context fields:

- `alerts`: the `AlertsLoader` instance
- `mongoose`: the shared Mongoose instance
- `nconf`: server configuration access
- `logger`: service logger

The currently implemented extension API on `context.alerts` is:

- `addColumnDefinitions(definitions)` to register extra alert fields before schema creation
- `migrateColumnDefinitions(definitions, cb)` to create indexes and backfill defaults for the new fields
- `getAllColumns()`, `getMandatoryColumns()`, `getColumn(name)`, `hasColumn(name)` for introspection

A typical plugin uses this hook to convert plugin config into alert column definitions or other server-side registrations, call `addColumnDefinitions()`, then call `migrateColumnDefinitions()` before Panther registers the alert schema.

Use this hook for backend concerns such as:

- extending alert schema fields
- creating or backfilling plugin-owned data
- wiring server-side data needed by later runtime code

### `applyConsole(context)`

Loaded by `oa-event-console` before the Express app is created. Use this phase for data-model and UI registration that does not need the Express app or Passport yet.

Context fields:

- `Field`: console field registry
- `SocketIO`: socket module, including `route_return()` for request-response handlers
- `config`: mutable console config object
- `logger`: service logger
- `registerAdminSection(section)`: adds an Admin page section
- `registerAuthProvider(provider)`: adds a provider button to the login UI
- `setLocalAuthEnabled(enabled)`: enables or disables built-in username/password login

The currently implemented console extension API on `Field` is:

- `Field.extend(extraDefinition, extraDefaultFields)` to merge extra grid field definitions and rebuild the default W2UI columns

A typical plugin uses this hook to:

- call `Field.extend()` with extra grid columns
- register admin-only Socket.IO routes for reading and writing plugin config
- register a new Admin page section that renders the plugin editor UI

Use this hook for frontend and shared-console concerns such as:

- adding fields to the event grid
- adding admin sections
- registering Socket.IO handlers used by plugin UI
- adding SSO provider metadata to the login page

### `applyConsoleAuth(context)`

Loaded by `oa-event-console` after the Express app exists and before the server starts listening.

Context fields:

- `app`: the underlying Express application
- `express`: the `ExpressApp` wrapper
- `passport`: the shared Passport instance
- `config`: mutable console config object
- `logger`: service logger
- `Field`
- `SocketIO`
- `registerAuthProvider(provider)`
- `setLocalAuthEnabled(enabled)`

Use this hook for auth-specific or route-specific work such as:

- registering Passport strategies
- mounting `/auth/...` routes and callbacks
- replacing the built-in local login flow

The intended split is:

- `applyConsole()` updates config and static UI registration
- `applyConsoleAuth()` wires live Express and Passport behavior

## Reference Pattern

A plugin that spans both server and console usually follows this flow:

1. `configure({ configFile })` reads a YAML array of column definitions.
2. `applyServer()` turns that YAML into server column definitions and passes them into `context.alerts`.
3. `applyConsole()` turns the same YAML into console field definitions, extends `Field`, then registers admin UI and socket handlers.

That pattern is a good template for plugins that need one shared config file and behavior in both services.

## Installing Third-Party Plugins

There are now two supported installation models.

### Option 1: Build-Time Install for Source Builds or Custom Images

Use this when you build Panther from source or build your own container images.

Install the plugin as a dependency of the service package that loads it:

- add the package to `packages/oa-event-server/package.json` if the plugin implements `applyServer()`
- add the package to `packages/oa-event-console/package.json` if the plugin implements `applyConsole()` or `applyConsoleAuth()`
- add it to both when the plugin spans both services

Then run the normal workspace install and build.

This is the preferred production path because the plugin is versioned with the image build and copied into the service's `node_modules` automatically.

If a team wants workspace-style development for a private plugin, they can clone it into the repository root and add it to the root workspace and Lerna package lists. That is a development convenience, not a runtime requirement.

### Local Development Without Rebuilding Docker Images

For active development from a source checkout, the current repository layout is intentionally optimized for:

```bash
npm install
lerna run build
npm run start/all
```

When developing a new plugin inside this repository, wire it in as both:

- a root workspace/Lerna package so `lerna run build` includes it
- a root `dependencies` entry so Node can resolve it from the Panther service packages at runtime

You should also add it as a `file:` dependency of each Panther service package that loads it.

When developing the plugin in a separate repository or in a folder outside this repo, do not add it to this repo's workspace list. In that case, Panther only needs to be able to resolve it at runtime, for example via:

- a `file:` dependency pointing at a local checkout outside this repo, for example `file:../../panther-example-plugin` or `file:../../../some/other/path/panther-example-plugin`
- a normal package dependency from npm or an internal registry
- a runtime install path such as `PANTHER_PLUGIN_INSTALL` for Docker images

For a local plugin folder outside this repo:

- do not add it to this repo's `workspaces` list
- do not add it to this repo's `lerna.json` package list
- do add it as a root dependency in this repo's `package.json` so Node can resolve it at runtime
- do add it as a `file:` dependency in each Panther service package that loads it
- do build that external plugin separately if it has its own TypeScript or other build step, because `lerna run build` in this repo will not build code that lives outside this repo

A local plugin can be included as:

- a root npm workspace
- a Lerna package
- a root `dependencies` entry so Node can resolve it from service packages via the top-level `node_modules`
- a `file:` dependency of both `oa-event-console` and `oa-event-server`

That means a normal root install/build will:

1. install the plugin from its root-level directory, for example `./panther-example-plugin`
2. build the plugin when `lerna run build` runs
3. make the package resolvable to both services when `npm run start/all` starts them

To ensure a local plugin loads while developing locally:

1. add the plugin to `packages/oa-event-console/config.yml` if the console should load it
2. add the plugin to `packages/oa-event-server/etc/server.ini` if the server should load it
3. run `npm install` again after dependency or workspace changes
4. run `npm run build && npm run start/all` from the repository root

If you change plugin TypeScript source, rerun `npm run build` before restarting Panther so the plugin's `lib/` output is refreshed.

Checklist for an in-repo plugin:

1. create the plugin at the repository root, for example `./panther-example-plugin`
2. add that directory to the root `workspaces` list in `package.json`
3. add that directory to the Lerna `packages` list in `lerna.json`
4. add the plugin to the root `dependencies` in `package.json`
5. add the plugin as a `file:` dependency in `packages/oa-event-console/package.json` if the console loads it
6. add the plugin as a `file:` dependency in `packages/oa-event-server/package.json` if the server loads it
7. add the plugin to `packages/oa-event-console/config.yml` if the console should load it
8. add the plugin to `packages/oa-event-server/etc/server.ini` if the server should load it
9. run `npm install`
10. run `npm run build && npm run start/all`

Checklist for a local plugin outside this repo:

1. keep the plugin in its own local folder, for example `../panther-example-plugin`
2. add the plugin to the root `dependencies` in this repo's `package.json`, for example `"panther-example-plugin": "file:../panther-example-plugin"`
3. add the plugin as a `file:` dependency in `packages/oa-event-console/package.json` if the console loads it
4. add the plugin as a `file:` dependency in `packages/oa-event-server/package.json` if the server loads it
5. add the plugin to `packages/oa-event-console/config.yml` if the console should load it
6. add the plugin to `packages/oa-event-server/etc/server.ini` if the server should load it
7. run `npm install`
8. build the external plugin in its own folder if needed
9. run `npm run build && npm run start/all`

### Option 2: Runtime Install for Pre-Built DockerHub Images

Use this when you are running `openanswers/panther-*` images directly and need to add plugins without rebuilding the images.

The console and server entrypoints now support:

- `PANTHER_PLUGIN_INSTALL`: JSON array of npm install targets
- `PANTHER_PLUGIN_DIR`: optional writable install directory, default `/tmp/panther-plugins`

At container startup Panther will:

1. run `npm install --omit=dev --no-save --prefix "$PANTHER_PLUGIN_DIR" ...`
2. prepend `$PANTHER_PLUGIN_DIR/node_modules` to `NODE_PATH`
3. continue normal Panther startup, so configured plugins can be resolved by package name

Example `docker-compose.yml` fragment:

```yaml
services:
  event-console:
    image: openanswers/panther-console:5
    environment:
      PANTHER_PLUGIN_INSTALL: '["git+https://github.com/acme/panther-oidc-auth.git#v1.2.3"]'
    volumes:
      - ./plugins:/plugins:ro
      - ./config/console.yml:/app/config.yml:ro

  event-server:
    image: openanswers/panther-server:5
    environment:
      PANTHER_PLUGIN_INSTALL: '["git+https://github.com/acme/panther-oidc-auth.git#v1.2.3"]'
    volumes:
      - ./plugins:/plugins:ro
      - ./config/server.ini:/app/etc/server.ini:ro
```

If the plugin needs its own config file, mount that file into the container and reference it from Panther config using a path that is valid from `/app`, for example:

```ini
plugins = [{"package":"panther-oidc-auth","config":"/plugins/panther-oidc-auth/config.yml"}]
```

```yaml
plugins:
  - package: panther-oidc-auth
    config: /plugins/panther-oidc-auth/config.yml
```

Use pinned versions, git tags, or tarball URLs for repeatable deploys. If the plugin is private, prefer an internal npm registry or pre-built tarball URL; git-based runtime installs also require repository credentials to be made available to the container.

## Recommended Packaging Pattern

For third-party extensions, the recommended approach is:

1. publish each plugin as its own npm package or installable git/tarball target
2. configure Panther to load it by package name
3. use build-time dependency installation for custom images
4. use `PANTHER_PLUGIN_INSTALL` only when consuming the stock DockerHub images

That keeps plugin code outside the core repository while still fitting Panther's existing `require(packageName)` loader model.
