# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


# Logging module
{ logger, debug } = require('oa-logging')('oa:event:route:api')

# npm modules
bodyParser = require 'body-parser'
_          = require 'lodash'

# OA modules
{ Mongoose } = require '../../lib/mongoose'
{ Api }  = require '../controller/api'


router = require('express').Router()

#router.use '/event',         require './api/event'
router.use '/apikey',        require './api/apikey'
# router.use '/integration',  require './api/integration'
# router.use '/rules',       require './api/rules'


# Protect the route
router.use (req, res, next) ->
  if req.user?
    next()
  else
    logger.error 'Client tried to API without auth session', req.sessionID
    res.status 401
    res.json {
      name: 'error'
      message: 'Not Permitted'
    }


###*
# @description shared schemas, responses
# @swagger
#
# responses:
#   200:
#     content:
#       application/json:
#         schema:
#           $ref: '#/definitions/GeneralApiResponse'
#   Unauthorised:
#     description: Unauthorised - permission denied
#     content:
#       application/json:
#         schema:
#           $ref: '#/definitions/GeneralApiError'
#   NotFound:
#     description: Not Found
#     content:
#       application/json:
#         schema:
#           $ref: '#/definitions/GeneralApiError'
#   NotImplemented:
#     description: Not implemented
#     content:
#       application/json:
#         schema:
#           $ref: '#/definitions/NameRecord'
# definitions:
#   GeneralApiError:
#     type: object
#     properties:
#       name:
#         type: string
#         enum:
#           - error
#       message:
#         type: string
#   NameRecord:
#     type: object
#     properties:
#       name:
#         type: string
#   GeneralApiResponse:
#     type: object
#     properties:
#       name:
#         type: string
#     required:
#       - name
#   GeneralApiResponseArray:
#     allOf:
#       - $ref: '#/definitions/GeneralApiResponse'
#       - type: object
#         properties:
#           data:
#             type: array
#             items: all
#   SelectCriterion:
#     type: string
#     enum:
#       - all
#       - none
#       - match
#       - equals
#       - equals
#       - field_exists
#       - field_missing
#       - starts_with
#       - ends_with
#       - less_than
#       - greater_than
#       - schedule
#   RuleOption:
#     type: string
#     enum:
#       - author
#       - debug
#       - original
#       - skip
#       - unless
#   ActionName:
#     type: string
#     enum:
#       - discard
#       - replace
#       - set
#       - stop
#       - stop_rule_set
#   GroupName:
#     type: string
#     pattern: '[\w \-_]+'
#   FieldName:
#     type: string
#     pattern: '[\w \-_]+'
#   FieldRecord:
#     type: object
#     properties:
#       name:
#         type: string
#       priority:
#         type: string
#         enum:
#           - C
#           - M
#       alias:
#         type: string
#       type:
#         type: string
#         enum:
#           - String
#           - Number
#       label:
#         type: string
#       label_shrt:
#         type: string
#       size:
#         type: integer
#         minimum: 1
#         maximum: 1000
#       help:
#         type: string
#       uniq:
#         type: boolean
#       view:
#         type: object
#         properties:
#           priority:
#             type: integer
#             minimum: 1
#           default:
#             type: boolean
#   ActionInput:
#     type: object
#     properties:
#       name:
#         type: string
#       label:
#         type: string
#       type:
#         type: string
#       beforetext:
#         type: string
#     required:
#       - name
#       - label
#       - type
#   ActionDiscard:
#     type: object
#     properties:
#       name:
#         type: string
#         enum:
#           - discard
#       description:
#         type: string
#       friendly_name:
#         type: string
#       friendly_after:
#         type: string
#       input:
#         type: array
#         items:
#           $ref: '#/definitions/ActionInput'
#   ActionReplace:
#     type: object
#     properties:
#       name:
#         type: string
#         enum:
#           - replace
#       description:
#         type: string
#       input:
#         type: array
#         items:
#           $ref: '#/definitions/ActionInput'
#   ActionSet:
#     type: object
#     properties:
#       name:
#         type: string
#         enum:
#           - set
#       description:
#         type: string
#       input:
#         type: array
#         items:
#           $ref: '#/definitions/ActionInput'
#   ActionStop:
#     type: object
#     properties:
#       name:
#         type: string
#         enum:
#           - stop
#       input:
#         type: array
#         items:
#           $ref: '#/definitions/ActionInput'
#   ActionStopRuleSet:
#     type: object
#     properties:
#       name:
#         type: string
#         enum:
#           - stop_rule_set
#       input:
#         type: array
#         items:
#           $ref: '#/definitions/ActionInput'
###

###*
# @swagger
# path:
#   /:
#     get:
#       summary: api welcome
#       responses:
#         "200":
#           description: welcome message
#           content:
#             "application/json":
#               example:
#                 name: api
#                 data: 'Hello there! I am the Panther api'
#                 version: 1
#               schema:
#                 type: object
#                 properties:
#                   name:
#                     type: string
#                     enum:
#                       - api
#                   data:
#                     type: string
#                   version:
#                     type: integer
###

router.get '/', ( req, res ) ->
  res.json {
    name: 'api'
    data: "Hello there! I am the #{req.app.locals.name} api",
    version: 1
  }

router.use bodyParser.json()

###*
# @deprecated
# @swagger
# path:
#   /filters:
#     get:
#       summary: filters base path
#       responses:
#         "401":
#           $ref: '#/responses/Unauthorised'
#         "405":
#           $ref: '#/responses/NotImplemented'
###
router.get '/filters', ( req, res ) ->
  res.json {
    name: 'filters'
  }

###*
# @deprecated
# @swagger
# path:
#   /severities:
#     get:
#       summary: severities base path
#       responses:
#         "401":
#           $ref: '#/responses/Unauthorised'
#         "405":
#           $ref: '#/responses/NotImplemented'
###

router.get '/severities', ( req, res ) ->
  res.json {
    name: 'api/severities'
  }

###*
# @deprecated
# @swagger
# path:
#   /rules/global:
#     get:
#       summary: global rules base path
#       responses:
#         "401":
#           $ref: '#/responses/Unauthorised'
#         "405":
#           $ref: '#/responses/NotImplemented'
###
router.get '/rules/global', ( req, res ) ->
  res.json {
    name: 'rules/global'
  }

###*
# @deprecated
# @swagger
# path:
#   /rules/groups:
#     get:
#       summary: group rules base path
#       responses:
#         "401":
#           $ref: '#/responses/Unauthorised'
#         "405":
#           $ref: '#/responses/NotImplemented'
###

router.get '/rules/groups', ( req, res ) ->
  res.json {
    name: 'rules/groups'
  }

###*
# @deprecated
# @swagger
# path:
#   /rules/group/{groupId}:
#     get:
#       summary: group rule base path
#       parameters:
#         - name: groupId
#           in: path
#           required: true
#           schema:
#             type: string
#       responses:
#         "401":
#           $ref: '#/responses/Unauthorised'
#         "405":
#           $ref: '#/responses/NotImplemented'
###

router.get '/rules/group/:id(\\w+)', ( req, res ) ->
  res.status 405
  res.json {
    name: 'rules/group'
  }

# Setup a route for all the plain api calls
routes = {
  ###*
  # @swagger
  # /groups:
  #   get:
  #     summary: API base path groups
  #     responses:
  #       "200":
  #         description: List of Groups
  #         content:
  #           "application/json":
  #             example:
  #               name: groups
  #               data:
  #                 - all
  #                 - some
  #                 - none
  #             schema:
  #               allOf:
  #                 - $ref: "#/definitions/GeneralApiResponseArray"
  #                 - type: object
  #                   properties:
  #                     name:
  #                       enum:
  #                         - groups
  #                     data:
  #                       type: array
  #                       items:
  #                         $ref: '#/definitions/GroupName'
  #       401:
  #         $ref: '#/responses/Unauthorised'
  ###
  groups:
    { handler: Api.get }

  ###*
  # @todo hook up controller/api
  # @swagger
  # /rules:
  #   get:
  #     summary: list all rules
  #     responses:
  #       401:
  #         $ref: '#/responses/Unauthorised'
  #       "405":
  #         $ref: '#/responses/NotImplemented'
  ###
  rules:
    { handler: Api.get }

  ###*
  # @swagger
  # /actions:
  #   get:
  #     summary: API actions list
  #     responses:
  #       "200":
  #         description: List of action names
  #         content:
  #           "application/json":
  #             example:
  #               name: actions
  #               data:
  #                 - discard
  #                 - replace
  #                 - set
  #                 - stop
  #                 - stop_rule_set
  #             schema:
  #               type: object
  #               properties:
  #                 name:
  #                   type: string
  #                   enum:
  #                     - actions
  #                 data:
  #                   type: array
  #                   items:
  #                     $ref: '#/definitions/ActionName'
  #       401:
  #         $ref: '#/responses/Unauthorised'
  ###
  actions:
    { handler: Api.get }

  ###*
  # @swagger
  # /actions_obj:
  #   get:
  #     summary: API actions object format
  #     responses:
  #       "200":
  #         description: Action names
  #         content:
  #           "application/json":
  #             example:
  #               name: actions_obj
  #               data:
  #                 discard:
  #                   name: discard
  #                   description: 'Discards the event immediately, and applies no further processing.'
  #                   friendly_name: Discard
  #                   friendly_after: this event
  #                   input: []
  #             schema:
  #               type: object
  #               properties:
  #                 name:
  #                   type: string
  #                   enum:
  #                     - actions_obj
  #                 data:
  #                   type: object
  #                   properties:
  #                     discard:
  #                       $ref: '#/definitions/ActionDiscard'
  #                     replace:
  #                       $ref: '#/definitions/ActionReplace'
  #                     set:
  #                       $ref: '#/definitions/ActionSet'
  #                     stop:
  #                       $ref: '#/definitions/ActionStop'
  #                     stop_rule_set:
  #                       $ref: '#/definitions/ActionStopRuleSet'
  #       401:
  #         $ref: '#/responses/Unauthorised'
  ###
  actions_obj:
    { handler: Api.get }

  ###*
  # @swagger
  # /selects:
  #   get:
  #     summary: API selections list
  #     responses:
  #       "200":
  #         description: List of selection criterion
  #         content:
  #           "application/json":
  #             example:
  #               name: selects
  #               data:
  #                 - all
  #                 - none
  #                 - match
  #                 - equals
  #                 - field_exists
  #                 - field_missing
  #                 - starts_with
  #                 - ends_with
  #                 - less_than
  #                 - greater_than
  #                 - schedule
  #             schema:
  #               type: object
  #               properties:
  #                 name:
  #                   type: string
  #                   enum:
  #                     - selects
  #                 data:
  #                   type: array
  #                   items:
  #                     $ref: '#/definitions/SelectCriterion'
  #       401:
  #         $ref: '#/responses/Unauthorised'
  ###
  selects:
    { handler: Api.get }

  ###*
  # @swagger
  # /selects_obj:
  #   get:
  #     summary: All selectors as object
  #     responses:
  #       "200":
  #         description: Selection names
  #         content:
  #           "application/json":
  #             example:
  #               name: selects_obj
  #               data:
  #                 all:
  #                   name: all
  #                   input: []
  #             schema:
  #               type: object
  #               properties:
  #                 name:
  #                   type: string
  #                   enum:
  #                     - selects_obj
  #                 data:
  #                   type: object
  #                   properties:
  #                     all:
  #                       type: object
  #                     none:
  #                       type: object
  #       401:
  #         $ref: '#/responses/Unauthorised'
  ###
  selects_obj:
    { handler: Api.get }

  ###*
  # @swagger
  # /options:
  #   get:
  #     summary: List of all rule options
  #     responses:
  #       "200":
  #         content:
  #           "application/json":
  #             example:
  #               name: options
  #               data:
  #                 - author
  #                 - debug
  #                 - original
  #                 - skip
  #                 - unless
  #             schema:
  #               type: object
  #               properties:
  #                 name:
  #                   type: string
  #                   enum:
  #                     - options
  #                 data:
  #                   type: array
  #                   items:
  #                     $ref: '#/definitions/RuleOption'
  #       401:
  #         $ref: '#/responses/Unauthorised'
  ###
  options:
    { handler: Api.get }

  ###*
  # @swagger
  # /options_obj:
  #   get:
  #     summary: Object of all rule options
  #     responses:
  #       "200":
  #         content:
  #           "application/json":
  #             example:
  #               name: otions_obj
  #               data:
  #                 original:
  #                   name: original
  #                   input: []
  #             schema:
  #               type: object
  #               properties:
  #                 name:
  #                   type: string
  #                   enum:
  #                     - options_obj
  #                 data:
  #                   type: object
  #       401:
  #         $ref: '#/responses/Unauthorised'
  ###
  options_obj: {
    handler: Api.get
  }

  ###*
  # @swagger
  # /fields:
  #   get:
  #     summary: list of available field names
  #     responses:
  #       "200":
  #         content:
  #           "application/json":
  #             example:
  #               name: fields
  #               data:
  #                 - acknowledged
  #                 - agent
  #                 - external_id
  #                 - first_occurrence
  #                 - group
  #                 - identifier
  #                 - node
  #                 - last_occurrence
  #                 - owner
  #                 - severity
  #                 - state_change
  #                 - summary
  #                 - tag
  #                 - tally
  #             schema:
  #               allOf:
  #                 - $ref: '#/definitions/GeneralApiResponseArray'
  #                 - type: object
  #                   properties:
  #                     name:
  #                       enum:
  #                         - fields
  #                     data:
  #                       items:
  #                         $ref: '#/definitions/FieldName'
  #       401:
  #         $ref: '#/responses/Unauthorised'
  ###
  fields:
    { handler: Api.get }

  ###*
  # @swagger
  # /rules/group/{groupId}:
  #   get:
  #     summary: retrieve one rule
  #     parameters:
  #       - name: groupId
  #         in: path
  #         required: true
  #         schema:
  #           type: string
  #         example: all
  #     responses:
  #       401:
  #         $ref: '#/responses/Unauthorised'
  #       404:
  #         $ref: '#/responses/NotFound'
  #       "405":
  #         $ref: '#/responses/NotImplemented'
  ###
  group: {
    path: '/rules/group/:id(\\w+)'
    handler: Api.get
  }
  
  ###*
  # @swagger
  # /rule/{ruleId}:
  #   get:
  #     summary: retrieve one rule
  #     parameters:
  #       - name: ruleId
  #         in: path
  #         required: true
  #         schema:
  #           type: string
  #     responses:
  #       401:
  #         $ref: '#/responses/Unauthorised'
  #       404:
  #         $ref: '#/responses/NotFound'
  #       405:
  #         $ref: '#/responses/NotImplemented'
  ###
  rule: {
    # FIXME
    path: '/rule/:id(\\w+)'
    handler: Api.get_id
  }

  ###*
  # @swagger
  # /action/{actionId}:
  #   get:
  #     summary: action definition
  #     parameters:
  #       - name: actionId
  #         in: path
  #         required: true
  #         examples:
  #           discard:
  #             value: discard
  #           replace:
  #             value: replace
  #           set:
  #             value: set
  #           stop:
  #             value: stop
  #           stop_rule_set:
  #             value: stop_rule_set
  #         schema:
  #           $ref: '#/definitions/ActionName'
  #     responses:
  #       "200":
  #         content:
  #           "application/json":
  #             example:
  #               name: action
  #               id: action
  #               data:
  #                 name: discard
  #                 description: Discards the event immediately, and applies no further processing.
  #                 friendly_name: Discard
  #                 friendly_after: this event
  #                 input: [ ]
  #             schema:
  #               allOf:
  #                 - $ref: '#/definitions/GeneralApiResponseArray'
  #                 - type: object
  #                   properties:
  #                     name:
  #                       enum:
  #                         - action
  #                     id:
  #                       $ref: '#/definitions/ActionName'
  #                     data:
  #                       type: object
  #                       properties:
  #                         name:
  #                           type: string
  #                         description:
  #                           type: string
  #                         input:
  #                           type: array
  #                           items:
  #                             $ref: '#/definitions/ActionInput'
  #       401:
  #         $ref: '#/responses/Unauthorised'
  #       404:
  #         $ref: '#/responses/NotFound'
  ###
  action: {
    path: "/action/:id(\\w+)"
    handler: Api.get_id
  }

  ###*
  # @swagger
  # /select/{selectId}:
  #   get:
  #     summary: select description
  #     parameters:
  #       - name: selectId
  #         in: path
  #         required: true
  #         schema:
  #           $ref: '#/definitions/SelectCriterion'
  #         examples:
  #           all:
  #             value: all
  #           equals:
  #             value: equals
  #     responses:
  #       "200":
  #         content:
  #           "application/json":
  #             examples:
  #               all:
  #                 value:
  #                   name: all
  #                   id: all
  #                   data:
  #                     name: all
  #                     input: []
  #               equals:
  #                 value:
  #                   name: equals
  #                   id: equals
  #                   data:
  #                     name: equals
  #                     description: Matches values that are exactly the same.
  #                     friendly_before: is
  #                     friendly_name: equal
  #                     friendly_after: to
  #                     help: This is a equals field, it must match the value exactly
  #                     input:
  #                       - name: field
  #                         label: field
  #                         type: string
  #                       - name: value
  #                         label: string or /regex/
  #                         type: stregex
  #                         array: true
  #             schema:
  #               allOf:
  #                 - $ref: '#/definitions/GeneralApiResponseArray'
  #                 - type: object
  #                   properties:
  #                     name:
  #                       enum:
  #                         - select
  #                     id:
  #                       $ref: '#/definitions/SelectCriterion'
  #                     data:
  #                       type: object
  #                       properties:
  #                         name:
  #                           type: string
  #                         description:
  #                           type: string
  #                         input:
  #                           type: array
  #                           items:
  #                             $ref: '#/definitions/ActionInput'
  #       401:
  #         $ref: '#/responses/Unauthorised'
  #       404:
  #         $ref: '#/responses/NotFound'
  ###
  select: {
    path: "/select/:id(\\w+)"
    handler: Api.get_id
  }

  option: {
    path: "/option/:id(\\w+)"
    handler: Api.get_id
  }

  ###*
  # @swagger
  # /field/{fieldId}:
  #   get:
  #     summary: API field description record
  #     parameters:
  #       - name: fieldId
  #         in: path
  #         required: true
  #         examples:
  #           node:
  #             value: node
  #           summary:
  #             value: summary
  #           identifier:
  #             value: identifier
  #           severity:
  #             value: severity
  #           tag:
  #             value: tag
  #         schema:
  #           type: string
  #     responses:
  #       "200":
  #         content:
  #           "application/json":
  #             examples:
  #               tag:
  #                 value:
  #                   name: field
  #                   id: field
  #                   data:
  #                     name: tag
  #                     priority: C
  #                     alias: app
  #                     type: String
  #                     label: Tag
  #                     label_shrt: Tag
  #                     size: 90
  #                     help: Tag for the event
  #                     view:
  #                       priority: 20
  #               severity:
  #                 value:
  #                   name: field
  #                   id: field
  #                   data:
  #                     name: severity
  #                     priority: M
  #                     alias: s
  #                     type: Number
  #                     label: Severity
  #                     label_shrt: Sev
  #                     size: 60
  #                     help: Severity of the event (0-5)
  #                     view:
  #                       priority: 120
  #                       default: true
  #             schema:
  #               allOf:
  #                 - "$ref": '#/definitions/GeneralApiResponse'
  #                 - type: object
  #                   properties:
  #                     id:
  #                       type: string
  #                     data:
  #                       $ref: '#/definitions/FieldRecord'
  #       401:
  #         $ref: '#/responses/Unauthorised'
  #       404:
  #         $ref: '#/responses/NotFound'
  ###
  field: {
    path: "/field/:id(\\w+)"
    handler: Api.get_id
  }
}


# Routes

# Setup a route for each item in the config above
# Use the key as the /route unless a `path` is supplied
# forEach createa a closure on `name` automatically
# plain get
_.keys(routes).forEach ( name ) ->
  debug 'setting up route for fetch (api)', name
  route = routes[name].path ?= "/#{name}"
  router.get "#{route}", ( args... ) ->
    routes[name].handler name, args...

# get by id
# _.keys(routes.fetch_id).forEach ( name ) ->
#   debug 'setting up route for fetch by id ', name
#   router.get "/#{name}/:id(\\w+)", ( args... ) ->
#     routes[name].handler Api.get_id name, args...


# json error handler
debug 'setting up route for 404'
router.get '/.*', ( req, res, next ) ->
  logger.error 'api 404', req.path
  res.status 404
  res.json {
    name: 'error'
    message: 'Not found'
    #data: req.path
  }


module.exports = router
  # route:   route
  # Api:      Api
