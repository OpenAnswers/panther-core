//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// jQuery must be available on window BEFORE other modules load.
// Bootstrap 3 and many legacy scripts check for window.jQuery at load time.
// Loaded as a separate Vite entry so it executes first in document order.
import $ from 'jquery';

window.jQuery = $;
window.$ = $;

if (import.meta.env.DEV) {
  // Surface jQuery 3 deprecation warnings during development only.
  import('jquery-migrate');
}
