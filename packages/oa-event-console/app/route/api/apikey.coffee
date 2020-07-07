
# Route Api Key - /api/apikey/

# Logging module
{ logger, debug } = require('oa-logging')('oa:event:route:api:apikey')

# npm modules
bodyParser = require 'body-parser'

# OA modules
Errors        = require 'oa-errors'
config        = require('../../../lib/config').get_instance()
{ Mongoose }  = require '../../../lib/mongoose'
{ _ }         = require 'oa-helpers'

# Model
{ ApiKey }    = require '../../model/apikey'


router = require('express').Router()

router.use bodyParser.json()


###*
# @swagger
#
# definitions:
#   Error:
#     type: object
#     properties:
#       name:
#         type: string
#         enum:
#           - error
#       message:
#         type: string
#     example:
#       name: error
#       message: Unauthorised
#   ApiKey:
#     type: string
#     pattern: '^[a-zA-Z0-9]+$'
#   ApiKeyRecord:
#     type: object
#     properties:
#       _id:
#         type: string
#         pattern: '[a-zA-Z0-9]+'
#       username:
#         type: string
#       __v:
#         type: number
#       created:
#         type: string
#         format: date-time
#       apikey:
#         $ref: '#/definitions/ApiKey'
#     required:
#       - _id
#       - username
#       - apikey
# responses:
#   Unauthorised:
#     description: Unauthorised
#     content:
#       application/json:
#         schema:
#           $ref: '#/definitions/Error'
###
#Deal with an apikey id param
router.param 'apikey', ( req, res, next, apikey ) ->
  debug 'found a param apikey', apikey
  req.apikey = apikey
  next()


###*
# @todo restrict access to internal components
# @description validates the existance of an API key
# @swagger
# /apikey/exists/{apiKey}:
#   get:
#     summary: Checks for the existence of an API key
#     parameters:
#       - name: apiKey
#         in: path
#         required: true
#         schema:
#           $ref: '#/definitions/ApiKey'
#     responses:
#       "200":
#         content:
#           "application/json":
#             schema:
#               type: object
#               properties:
#                 found:
#                   type: boolean
###
router.get '/exists/:apikey', ( req, res, next ) ->
  ApiKey.findOneAsync { apikey: req.apikey }
  .then ( doc ) ->
    unless doc
      return res.json { found: false }
    else
      return res.json { found: true }
  .catch ( err ) ->
    logger.error err
    next err



###*
# @description restrict access to admin
###
router.use (req, res, next) ->
  if req.user and req.user.group and req.user.group is 'admin'
    next()
  else
    logger.error 'Client tried to API without auth session', req.sessionID
    res.status 401
    res.json {
      name: 'error'
      message: 'Not Permitted'
    }


###*
# @swagger
# /apikey/read:
#   get:
#     summary: List of API keys
#     responses:
#       "200":
#         content:
#           "application/json":
#             schema:
#               type: object
#               properties:
#                 results:
#                   type: integer
#                   minimum: 0
#                 data:
#                   type: array
#                   items:
#                     $ref: '#/definitions/ApiKeyRecord'
#       401:
#         $ref: '#/responses/Unauthorised'
###
router.get '/read', ( req, res, next ) ->
  ApiKey.findAsync()
  .then ( docs ) ->
    res.json {
      results: docs.length
      data: docs
    }
  .catch ( err ) ->
    logger.error err
    next err

###*
# @swagger
# /apikey/read/{apiKey}:
#   get:
#     summary: view and API key
#     parameters:
#       - name: apiKey
#         in: path
#         required: true
#         schema:
#           $ref: '#/definitions/ApiKey'
#     responses:
#       "200":
#         content:
#           "application/json":
#             schema:
#               type: object
#               properties:
#                 results:
#                   type: integer
#                   minimum: 1
#                   maximum: 1
#                 data:
#                   type: array
#                   items:
#                     $ref: '#/definitions/ApiKeyRecord'
#       401:
#         $ref: '#/responses/Unauthorised'
#       404:
#         $ref: '#/responses/NotFound'
###

router.get '/read/:apikey', ( req, res, next ) ->
  ApiKey.findOneAsync { apikey: req.apikey }
  .then ( doc ) ->
    unless doc
      next new Errors.HttpError404
    else
      res.json {
        results: 1
        data: [ doc ]
      }

  .catch ( err ) ->
    logger.error err
    next err

###*
# @swagger
# /apikey/delete/{apiKey}:
#   delete:
#     summary: remove an API key
#     parameters:
#       - name: apiKey
#         in: path
#         required: true
#         schema:
#           $ref: '#/definitions/ApiKey'
#     responses:
#       "200":
#         content:
#           "application/json":
#             schema:
#               type: object
#               properties:
#                 message:
#                   type: string
#       401:
#         $ref: '#/responses/Unauthorised'
#       404:
#         $ref: '#/responses/NotFound'
###

router.delete '/delete/:apikey', ( req, res, next ) ->
  logger.debug 'removing apikey', req.apikey
  ApiKey.removeAsync { apikey: req.apikey }
  .then ( doc ) ->
    debug 'remove doc result', doc?.result
    unless doc
      throw new Errors.HttpError404
    
    if doc.result.ok isnt 1 or doc.result.n isnt 1
      throw new Errors.HttpError404

    logger.info 'apikey removed', req.apikey
    res.json { result: doc.result, message: "deleted" }
  
  .catch ( err ) ->
    debug 'remove error', err
    next err



router.use ( error, req, res, next ) ->
  code = if error.code then error.code else 500
  logger.error error.message, error.stack if error.code is 500
  res.status(code).json { message: error.message }

module.exports = router
