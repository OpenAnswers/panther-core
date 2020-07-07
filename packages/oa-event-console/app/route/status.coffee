

router = require('express').Router()

setup = (app) ->
  app.locals.start_time   = Date.now()
  app.locals.update_time  = Date.now()
  require('../controller/status-time')(app)

#app.locals.start_time = Date.now()
#app.locals.update_time = Date.now()

###*
# @swagger
# definitions:
#   TimeStamp:
#     type: integer
#     minimum: 1
#   TimeStart:
#     type: object
#     properties:
#       start:
#         $ref: '#/definitions/TimeStamp'
#   TimeNow:
#     type: object
#     properties:
#       now:
#         $ref: '#/definitions/TimeStamp'
#   TimeUpdate:
#     type: object
#     properties:
#       update:
#         $ref: '#/definitions/TimeStamp'
#   Time:
#     type: object
#     allOf:
#       - $ref: "#/definitions/TimeStart"
#       - $ref: "#/definitions/TimeNow"
#       - $ref: "#/definitions/TimeUpdate"
###

###*
# @swagger
# /status:
#   get:
#     summary: System uptime record
#     responses:
#       "200":
#         description: is it up
#         content:
#           "application/json":
#             example:
#               status:
#                 time:
#                   now: 1588251181072
#                   start: 1588251060612
#                   update: 1588251061234
#             schema:
#               type: object
#               properties:
#                 status:
#                   type: object
#                   properties:
#                     time:
#                       $ref: '#/definitions/Time'
###
router.get '/', (req, res, next)->
  res.json
    status:
      time:
        now: Date.now()
        start: req.app.locals.start_time
        update: req.app.locals.update_time
###*
# @noswagger
# path:
#   /status/zmq:
#     get:
#       summary: zmq
#     responses:
#       "200":
#         description: is it up
###
router.get '/zmq', (req, res, next)->
  res.json
    time:
      now: Date.now()
    zmq:
      socket:
        'dummy':
          connections: -1
          depth: -1

router.get '/mongodb', (req, res, next)->
  res.json
    time:
      now: Date.now()
    mongodb:
      uri:
        'dummy':
          connections: -1
          running_queries: -1

###*
# @swagger
# /status/time:
#   get:
#     summary: System uptime record
#     responses:
#       "200":
#         description: is it up
#         content:
#           "application/json":
#             schema:
#               type: object
#               properties:
#                 time:
#                   $ref: '#/definitions/Time'
###

router.get '/time', (req, res, next)->
  res.json
    time:
      start: req.app.locals.start_time
      now: Date.now()
      update: req.app.locals.update_time

###*
# @swagger
# /status/time/now:
#   get:
#     summary: System uptime record
#     responses:
#       "200":
#         description: is it up
#         content:
#           "application/json":
#             schema:
#               $ref: '#/definitions/TimeNow'
###

router.get '/time/now', (req, res, next)->
  res.json
    now: Date.now()

###*
# @swagger
# /status/time/start:
#   get:
#     summary: System uptime record
#     responses:
#       "200":
#         description: is it up
#         content:
#           "application/json":
#             schema:
#               $ref: '#/definitions/TimeStart'
###

router.get '/time/start', (req, res, next)->
  res.json
    start: req.app.locals.start_time

###*
# @swagger
# /status/time/update:
#   get:
#     summary: System uptime record
#     responses:
#       "200":
#         description: is it up
#         content:
#           "application/json":
#             schema:
#               $ref: '#/definitions/TimeUpdate'
###
router.get '/time/update', (req, res, next)->
  res.json
    update: req.app.locals.update_time


module.exports = 
  router: router
  setup: setup