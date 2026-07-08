// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// Charts bundle — OA d3 helpers.
// d3 v3 is loaded as a plain <script defer> tag (copied from node_modules via
// copy-vendor.js) because its `this.document` / `this.d3 = d3` pattern breaks
// in ES module strict mode.
import './d3.occurrence';
import './d3.severity';
import './d3.helpers';
import './d3.stack.svg';
