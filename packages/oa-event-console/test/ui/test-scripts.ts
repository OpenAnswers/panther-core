// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// Test-only version of _scripts.ts that skips side-effect-heavy modules
// (global.ts = socket.io, browser.ts = navigator checks).
// Loaded via the concat plugin which inlines all imports into a shared scope.
import '../../app/assets/js/notify-combined.js';
import '../../app/assets/js/errors';
import '../../app/assets/js/oa-errors.js';
import '../../app/assets/js/logging';
import '../../app/assets/js/helpers';
import '../../app/assets/js/timer';
import '../../app/assets/js/form';
import '../../app/assets/js/message';
import '../../app/assets/js/notifications';
import '../../app/assets/js/rendered';
