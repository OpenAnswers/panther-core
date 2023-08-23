
Joi = require '@hapi/joi'

{logger, debug}   = require('oa-logging')('oa:validations:import_rules')
Errors = require '../../lib/errors'

git_commit_msg_definition = Joi.string()
.empty('')
.pattern(/^[0-9a-zA-Z \-+$!#@]+$/)
.max(256, 'utf8')
.error (errors)->
  errors.forEach (err)->
    switch err.code
      when 'string.max'
        err.message = "Commit Message is too long"
        break;
      when 'string.pattern.base'
        err.message = "Commit Message contains invalid characters"
        break
  # debug "returning errors: ", errors
  errors

module.exports =
  git_commit_msg_schema: git_commit_msg_definition
