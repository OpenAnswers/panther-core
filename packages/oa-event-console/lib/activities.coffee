# # Activities

# As this is a web system we need a place to log system activity that users
# can subscribe to a feed, query or audit at a later date.

# Events are the only activity category in use so far, this is what populate
# the activity stream on the dashboard and sidebar


# logging
{ logger, debug } = require('oa-logging')('oa:event:activity')

# node modules
util              = require 'util'

# npm modules
Promise           = require 'bluebird'
mongoose          = require 'mongoose'
moment            = require 'moment'

# oa modules
Errors            = require './errors'
{ Activity }      = require '../app/model/activity'
{ _
  format_string_object
  throw_error }   = require 'oa-helpers'


# ## Class Activities

class Activities

  # `@types` holds inforomation on all the different activity types

  @types:
    event:

      assign:
        message: '{username} assigned {metadata.ids} to {metadata.owner}'

      clear:
        message: '{username} cleared {metadata.ids}'

      'delete-all':
        message: '{username} deleted all events'

      'delete':
        message: '{username} deleted {metadata.ids}'

      severity:
        message: '{username} changed {metadata.ids} severity to {metadata.severity}'

      acknowledge:
        message: '{username} acknowledged {metadata.ids}'

      unacknowledge:
        message: '{username} unacknowledged {metadata.ids}'


    user:

      create:
        message: '{username} added new user {metadata.username}'

      'delete':
        message: '{username} removed new user {metadata.username}'

      update:
        message: '{username} updated the user {metadata.username}'

      reset:
        message: '{username} reset {metadata.username}\'s password'

      login:
        message: '{username} logged in'

      login_failed:
        message: '{username} log in failed'

      logout:
        message: '{username} logged out'


    rules:

      deploy:
        message: '{username} deployed the {metadata.type} changes'

      discard:
        message: '{username} discarded the {metadata.type} changes'

      create:
        message: '{username} created a new {metadata.type} rule "{metadata.name}"'

      'delete':
        message: '{username} deleted the {metadata.type} rule "{metadata.name}"'

      update:
        message: '{username} modified the {metadata.type} rule "{metadata.name}"'

      agent_update:
        message: '{username} modified {metadata.type}\'s "{metadata.name}"'

      group_update:
        message: '{username} modified the {metadata.type} "{metadata.name}"'

      group_create:
        message: '{username} created the {metadata.type} "{metadata.name}"'

      group_delete:
        message: '{username} deleted the group "{metadata.name}"'

      group_select:
        message: '{username} modified the {metadata.type} select for "{metadata.name}"'

    apikey:

      create:
        message: '{username} created an API key'

      'delete':
        message: '{username} deleted an API key'


    certificate:

      create:
        message: '{username} created a certificate for "{metadata.name}"'

      'delete':
        message: '{username} deleted the certificate for "{metadata.name}"'


    integration:

      create:
        message: '{username} created a {metadata.type} integration'

      'delete':
        message: '{username} deleted the {metadata.type} integration "{metadata.name}"'

      update:
        message: '{username} modified the {metadata.type} integration "{metadata.name}"'


    provision:

      create:
        message: 'The "{metadata.name}" event console was created'

  # History is the activity logging inside an event

  @history:
    acknowledge:
      message: 'Acknowleged'
    unacknowledge:
      message: 'Unacknowledged'
    assign:
      message: 'Assigned to %s'
      fields: [ 'owner' ]
    severity:
      message: 'Changed severity to %s'
      fields: [ 'severity' ]
    clear:
      message: 'Cleared event'
    external_id:
      message: 'Changed external ID to %s'
      fields: [ 'external_id' ]


  # ###### store( activity_type, name, metadata )
  
  # Promise to store an activity in the database
  # Allows you to control the return and catch more directly
  @store_Async: ( category, type, username, metadata )->
    self = @
    new Promise ( resolve, reject )->
      unless self.types[category]?
        throw_error "No category", category

      unless self.types[category][type]?
        throw_error "No type in category", category, type

      db_type = self.types[category][type]

      activity = new Activity
        username: username
        metadata: metadata
        category: category
        type: type
        #message:
          #text: message

      activity.message.text = if db_type and db_type.message
        format_string_object self.types[category][type].message, activity

      debug 'Saving new activity to db', activity

      activity.saveAsync()
      .then ( result )->
        resolve result

      .catch ( error )->
        logger.error 'There was an error saving activity cat[%s] type[%s] user[%s]',
          category, type, username, metadata, error, error.stack
        reject error


  # Store an activity in the database
  # Manages the catch and logging for you
  @store: ( category, type, username, metadata )->

    @store_Async( category, type, username, metadata )
    .then ( results )->
      debug 'Activity saved to db', results

    .catch ( error )->
      logger.error 'Error saving activity to the db',
        category, type, username, metadata, error.message, error.stack


  # Store an event activity in the database
  @store_event: ( type, username, metadata )->
    @store 'event', type, username, metadata


  # ###### type_to_history_text( type, set_fields )

  # We need to log some information for each update type
  # All messages for the types are stored here and looked up via their name.
  # `fields` will be used for any %s string replacements (via urtil.format)

  # `type` - the type of message to create
  # `set_fields` - the data being set in this operation
  # Returns - A formatted message string

  @type_to_history_text: ( type, set_fields )->
    format_vars = []
    if @history[type].fields?
      for name in @history[type].fields
        format_vars.push set_fields[name]

    util.format @history[type].message, format_vars...


module.exports =
  Activities: Activities
