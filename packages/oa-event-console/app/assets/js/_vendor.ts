// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// Vendor bundle — replaces bower packages.
// Loaded on every page before _scripts.
// NOTE: jQuery globals (window.$ / window.jQuery) are set by _jquery-global.ts
// which must be loaded as a separate entry BEFORE this bundle so that
// Bootstrap and other jQuery plugins find it at load time.
// Bootstrap 3 (finds jQuery on window, set by jquery_global entry)
import 'bootstrap';

// Bluebird Promise
import Promise from 'bluebird';
// Debug logging factory (debug('namespace') → returns a logger)
import createDebug from 'debug';
// Lodash
import _ from 'lodash';
// Mustache templates
import Mustache from 'mustache';

// jQuery Timeago plugin (side-effect, attaches to $.fn.timeago)
import 'timeago';
// Bootstrap 3 Typeahead (side-effect, attaches to $.fn.typeahead)
import 'bootstrap-3-typeahead';

// Clipboard
import Clipboard from 'clipboard';
// FileSaver
import { saveAs } from 'file-saver';
// jQuery UI is NOT bundled here — v1.14 ships AMD-only UMD which does not
// register widgets correctly under Rollup. It is loaded as a plain <script>
// tag (copied from node_modules/jquery-ui/dist via copy-vendor.js).

// socket.io-client — provides window.io for global.ts
import { io } from 'socket.io-client';

window._ = _;

window.Promise = Promise;

window.Mustache = Mustache;

window.debug = createDebug;

window.io = io;

window.Clipboard = Clipboard;

window.saveAs = saveAs;
