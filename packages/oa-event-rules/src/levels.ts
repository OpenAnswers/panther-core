// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Levels mappings from syslog to
// event console come from the file
class Levels {
  static generate(yaml_def) {
    return yaml_def.syslog_severity_map;
  }
}

module.exports = Levels;
