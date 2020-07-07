# Levels mappings from syslog to
# event console come from the file
class Levels
  @generate: (yaml_def) ->
    yaml_def.syslog_severity_map

module.exports = Levels