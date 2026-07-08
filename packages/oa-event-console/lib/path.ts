
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// logging modules
const {debug, logger} = require('oa-logging')('oa:express:path');

// node modules
const path            = require('path');


// ### Path

// Store a set of paths for an Express web app in a singleton
// Avaialbe anywhere you include Path
// Should be added to Config.
//
// base   - base app dir
// view   - app views
// public - public web dir
// assets - js/css compiled assets

class Path {
  static p: any;
  static base: string;
  static app: string;
  static views: string;
  static routes: string;
  static assets: string;
  static socketio: string;
  static emails: string;
  static public: string;
  static path: any;
  [key: string]: any;

  static initClass() {

    this.p = path;

    // Detect whether we're running from dist/lib/ or source lib/
    const inDist = __dirname.includes(path.sep + 'dist' + path.sep) ||
                   __dirname.endsWith(path.sep + 'dist');

    // Package root — for static files, pug templates, public/
    // From dist/lib/ go up two levels; from lib/ go up one level
    this.base =      inDist ? path.join(__dirname, "../..") : path.join(__dirname, "..");

    // Compiled app root — JS modules loaded at runtime live in dist/app/
    // From source, app/ is a sibling of lib/
    const dist =     inDist ? path.join(__dirname, "..") : this.base;

    // Compiled JS paths (inside dist/ or source root)
    this.app =       path.join(dist,         "app");
    this.routes =    path.join(this.app,     "route");
    this.socketio =  path.join(this.app,     "socketio");

    // Source-only paths (pug templates, static assets — not compiled)
    this.views =     path.join(this.base,    "app", "view");
    this.assets =    path.join(this.base,    "app", "assets");
    this.emails =    path.join(this.base,    "app", "emails");

    this.public =    path.join(this.base,    "public");
  }

  // Give people access to node join
  static resolve(...paths) {
    return path.resolve(...paths || []);
  }

  // Give people access to node join
  static join(...paths) {
    return path.join(...paths || []);
  }

  // Create paths from the local base for this nodejs app
  static local(...paths) {
    debug('args', this.base, paths);
    return path.join(this.base, ...paths);
  }


  static add( name, value ) {
    if (Path.path) { throw new Error(`property already exists [${name}]`); }
    return Path[name] = value;
  }

  static add_local( name, value ) {
    value ??= name;
    return this.add(name, Path.local(value));
  }
}
Path.initClass();


// Export the useful bits
module.exports =
  {Path};