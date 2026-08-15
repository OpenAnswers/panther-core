# Panther Plugin Extensions

This repository now supports config-driven extension packages for the event server and event console.

The important constraint is package resolution, not repository layout. A plugin does not need to live under `packages/` as long as the relevant Panther process can `require()` it by package name.

## Overview

Panther loads plugins separately in each service:

- `oa-event-server` reads `plugins` from `packages/oa-event-server/etc/server.ini` by default, or from `OA_SERVER_CONFIG_FILE` when that environment variable is set.
- `oa-event-console` reads `plugins` from `packages/oa-event-console/config.yml` by default, or from `OA_CONSOLE_CONFIG_FILE` when that environment variable is set. `OA_CONFIG_FILE` remains supported as the older console override name.

Each plugin entry names an npm package and can optionally point to a plugin-specific config file.

Installing a plugin package is not enough on its own. Panther only loads plugins that are explicitly listed in the effective service config for the process that should use them:

- add the plugin to `packages/oa-event-console/config.yml` if the console should load it
- add the plugin to `packages/oa-event-server/etc/server.ini` if the server should load it
- add it to both only when the plugin participates in both services

If you want to avoid editing tracked Panther config files, keep plugin-owned config files in the plugin repository and point Panther at them with the environment-variable overrides above.

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

For active development from source, there are two practical models.

#### Model A: Plugin Lives Inside This Repository

Use this when the plugin is part of the Panther workspace and should participate in the repo's normal install/build flow.

Checklist:

1. create the plugin at the repository root, for example `./panther-example-plugin`
2. add that directory to the root `workspaces` list in `package.json`
3. add that directory to the Lerna `packages` list in `lerna.json`
4. add the plugin to the root `dependencies` in `package.json`
5. add the plugin as a `file:` dependency in `packages/oa-event-console/package.json` if the console loads it
6. add the plugin as a `file:` dependency in `packages/oa-event-server/package.json` if the server loads it
7. add the plugin to the effective console and server config files, or point Panther at plugin-owned config files using `OA_CONSOLE_CONFIG_FILE` and `OA_SERVER_CONFIG_FILE`
8. run `npm install`
9. run `npm run build`
10. start Panther

#### Model B: Plugin Lives In A Separate Sibling Repository

Use this when you want to develop the plugin outside `panther-core` and avoid editing tracked files in this repo.

This is now a supported source-development path. Panther only needs:

1. the plugin to be resolvable by package name at runtime
2. plugin-enabled console and server config files

The tested workflow is:

1. keep the plugin in a sibling folder, for example `../panther-example-plugin`
2. build that plugin in its own repository so its runtime output exists
3. create plugin-owned config files in the plugin repository for the console and server
4. set `NODE_PATH` to the parent directory that contains both repositories so `require('panther-example-plugin')` resolves without installing the plugin into `panther-core`
5. start `oa-event-server` with `OA_SERVER_CONFIG_FILE=/path/to/plugin-owned/server.ini npm start`
6. start `oa-event-console` with `OA_CONSOLE_CONFIG_FILE=/path/to/plugin-owned/config.yml npm start`

Example:

```bash
cd /path/to/panther-core
export NODE_PATH="$(pwd)/.."

cd packages/oa-event-server
OA_SERVER_CONFIG_FILE=../../../panther-example-plugin/configs/local-server.ini npm start
```

In a second terminal:

```bash
cd /path/to/panther-core
export NODE_PATH="$(pwd)/.."

cd packages/oa-event-console
OA_CONFIG_FILE=../../../panther-example-plugin/configs/local-config.yml npm start
```

This avoids changing `packages/oa-event-server/etc/server.ini` and `packages/oa-event-console/config.yml` in the Panther repository.

If you change plugin TypeScript source, rerun that plugin's own build before restarting Panther so the plugin's runtime output is refreshed.

### Option 2: Runtime Install for Pre-Built DockerHub Images

Use this when you are running `openanswers/panther-*` images directly and need to add plugins without rebuilding the images.

The console and server entrypoints now support:

- `PANTHER_PLUGIN_INSTALL`: JSON array of npm install targets
- `PANTHER_PLUGIN_DIR`: optional writable install directory, default `/tmp/panther-plugins`
- `OA_CONSOLE_CONFIG_FILE`: optional path to a console config file to load instead of `/app/config.yml`
- `OA_SERVER_CONFIG_FILE`: optional path to a server config file to load instead of `/app/etc/server.ini`

At container startup Panther will:

1. run `npm install --omit=dev --no-save --prefix "$PANTHER_PLUGIN_DIR" ...`
2. prepend `$PANTHER_PLUGIN_DIR/node_modules` to `NODE_PATH`
3. continue normal Panther startup, so configured plugins can be resolved by package name

Example `docker-compose.yml` fragment using plugin-owned config files and no Panther config overmounts:

```yaml
services:
  event-console:
    image: openanswers/panther-console:5
    environment:
      PANTHER_PLUGIN_INSTALL: '["git+https://github.com/acme/panther-oidc-auth.git#v1.2.3"]'
      OA_CONSOLE_CONFIG_FILE: /plugins/panther-oidc-auth/configs/docker-console-config.yml
    volumes:
      - ./plugins/panther-oidc-auth:/plugins/panther-oidc-auth:ro

  event-server:
    image: openanswers/panther-server:5
    environment:
      PANTHER_PLUGIN_INSTALL: '["git+https://github.com/acme/panther-oidc-auth.git#v1.2.3"]'
      OA_SERVER_CONFIG_FILE: /plugins/panther-oidc-auth/configs/docker-server.ini
    volumes:
      - ./plugins/panther-oidc-auth:/plugins/panther-oidc-auth:ro
```

In that model, the plugin repository carries the Docker-specific Panther config files as well as any plugin-specific config payload. Those plugin-owned Docker config files should still list the plugin explicitly, for example:

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
