# # Routes - rules

# logging
{ logger, debug } = require('oa-logging')('oa:event:routes:rules')

# npm modules
jade   = require 'jade'
router = require('express').Router()

# oa modules
Errors         = require 'oa-errors'
{ EventRules
  Action
  Select
  Option }     = require 'oa-event-rules'
{ Field }      = require '../../lib/field'
{ _ }          = require 'oa-helpers'
{ rules_agent_name_schema, rules_group_name_schema } = require '../validations'



# put stuff in here!
# { Controller } = require '../controller/rules'

config = require('../../lib/config').get_instance()


# common vars to pass to every rules page
build_vars = ( req, override ) ->
  vars =
    title: 'Rules'
    actions:    Action.types_list()
    selects:    Select.types_list()
    options:    Option.types_list()
    rules:      req.app.locals.rules
    fields:     Field.list()
    user:       req.user
    debug_jade: debug
    jade:       jade
    uuid_enabled: config.app.uuid_enabled
    development: process.env.NODE_ENV == "development" ? true : false

  if override?
    _.defaults override, vars
  else
    vars


# Protect this route
router.use (req, res, next) ->
  if req.user?
    next()
  else
    logger.error 'Client tried to access console without auth session', req.sessionID
    res.redirect "/?redirectUrl=#{req.originalUrl}"



router.get ['/','all'], (req, res)->
  res.render 'rules', build_vars req

###
router.get '/globals', (req, res)->
  res.render 'rules-global', build_vars req,
    rules_name: 'Global Rules'
    rules_id: 'global'

router.get '/groups', (req, res)->
  res.render 'rules-groups', build_vars req,
    rules_name: 'Group Rules'
    rules_id: 'group'
###

router.get '/globals', (req, res) ->
  res.render 'rules-management', build_vars req,
    rules_name: 'Global Rules'
    type: 'server'
    sub_type: 'globals'
    gitEnabled: config.rules.git

router.get '/groups', (req, res) ->
  res.render 'rules-management', build_vars req,
    rules_name: 'Group Rules'
    type: 'server'
    sub_type: 'groups'
    gitEnabled: config.rules.git
    uuid_enabled: config.app.uuid_enabled

router.get '/group/:id', (req, res, next)->

  {value, error} = rules_group_name_schema.validate( req.params.id )
  if error
    logger.error "Validation failure", error.message
    return next()

  group_name = value
  unless _.indexOf(config.rules.server.groups.names(), group_name) >= 0
    logger.error "Invalid path accessed ", req.path
    return next()

  # FIXME/CHANGEME
  # rendering of a single group may be implmeneted in the future
  return next()

  res.render 'rules-groups', build_vars req,
    type: 'server'
    sub_type: "group_#{group_name}"
    gitEnabled: config.rules.git

router.get '/agents', (req, res) ->
  res.render 'rules-management', build_vars req,
    rules_name: 'Agent Rules'
    type: 'agent'
    sub_type: 'all'
    gitEnabled: config.rules.git

router.get '/schedules', (req,res)->
  res.render 'schedules', build_vars req,
    type: 'schedule'

router.get '/agent/:id', (req, res, next) ->


  {value, error} = rules_agent_name_schema.validate( req.params.id )

  if error
    logger.error "Invalid agent type ", req.path
    return next()

  # config.rules.types = ['server', 'syslogd', ...]
  error = null
  unless _.indexOf(config.rules.types, value) > 0
    # /rules/agent/server is probably invalid, hence indexOf > 0 being valid
    logger.error "Invalid agent type ", req.path
    return next()
  unless config.rules[value]
    logger.error "Unknown agent ", req.path
    return next()

  res.render 'rules-management', build_vars req,
    rules_name: "Agent #{value} Rules"
    type: 'agent'
    sub_type: value
    error: error
    gitEnabled: config.rules.git

router.get '/new', (req, res)->
  res.render 'rules-new', build_vars req
  
router.get '/info', (req, res)->
  res.render 'rules-info', build_vars req

router.get '/data/export', (req,res)->
  res.render 'data-export', build_vars req




module.exports = router
