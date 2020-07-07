
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
# responses:
#   Unauthorised:
#     description: Unauthorised
#     content:
#       application/json:
#         schema:
#           $ref: '#/definitions/Error'
###


# Placeholder for the http-monitor
# actual definitions constructed from node-oa-event_monitors/lib/http/index.js

###*
# @description Creates an Event--
# @swagger
# /event/create:
#   post:
#     summary: Event creation
#     security:
#       - ApiKeyToken: []
#     operationId: eventCreate
#     requestBody:
#       description: Event to create
#       required: true
#       content:
#         application/json:
#           examples:
#             appup:
#               value:
#                 event:
#                   node: localhost
#                   summary: app started
#                   severity: 1
#             appdown:
#               value:
#                 event:
#                   node: localhost
#                   summary: app shutdown
#                   severity: 3
#             appcrashed:
#               value:
#                 event:
#                   node: localhost
#                   summary: app crashed
#                   severity: 5
#           schema:
#             type: object
#             properties:
#               event:
#                 type: object
#                 required:
#                   - node
#                   - summary
#                   - severity
#                 properties:
#                   node:
#                     type: string
#                   summary:
#                     type: string
#                   tag:
#                     type: string
#                   severity:
#                     type: integer
#                     format: int32
#                     minimum: 0
#                     maxiumum: 5
#     responses:
#       "200":
#         description: Event created or updated
#         content:
#           "application/json":
#             schema:
#               type: object
#               properties:
#                 status:
#                   type: string
#                 message:
#                   type: string
#                 event:
#                   type: object
#                   properties:
#                     agent:
#                       type: string
#                       enum:
#                         - http
#
#       401:
#         description: Not authorised
#         content:
#           application/json:
#             schema:
#               $ref: '#/definitions/Error'
#
###