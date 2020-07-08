# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# Levels mappings from syslog to
# event console come from the file
class Levels
  @generate: (yaml_def) ->
    yaml_def.syslog_severity_map

module.exports = Levels