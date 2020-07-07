
# logging
{logger, debug} = require('oa-logging')('oa:event:model:filters')

# npm modules
Promise  = require 'bluebird'
mongoose = require 'mongoose'


# # FilterSchema

# This is the filter schema. It stores filters for users
# It may store default filters as well

FilterSchema = new mongoose.Schema

  # User the filter is associated with
  user:
    type: String

  # Name of the filter
  name:
    type: String
    required: true

  field:
    type: String
    #required: true

  value:
    type: String
    #required: true

  # f is the filter.. why not filter?
  # This is used as a mongo filter object
  f:
    type: mongoose.Schema.Types.Mixed
    default: {}

  default:
    type: Boolean
    default: false

  created_at:
    type: Date

  modified_at:
    type: Date

  # Is the filter system or not
  system:
    type: Boolean
    default: false


# Automatically populate new records with a created_at date
.pre 'save', ( next ) ->
  unless @created_at?
    @created_at = new Date()
  next()

# Automatically populate modified_at with the current date
.pre 'save', ( next ) ->
  @modified_at = new Date()
  next()

# Check if we already have this name
# .pre 'save', ( next ) ->
#   next()



# Update
FilterSchema.statics.update_data = ( data, cb )->
  debug 'findByIdAndUpdate data', data
  unless data._id?
    return cb new Errors.ValidationError('No _id field in update data')
  unless data.name?
    return cb new Errors.ValidationError('No name field in update data')
  data.name = "#{data.name}"

  @findByIdAndUpdate data._id, data, cb


# Set default
FilterSchema.statics.set_default = ( user, id, cb )->
  debug 'set_default view', user, id
  cb new Errors.ValidationError('No id in update data') unless id?
  cb new Errors.ValidationError('No user in update data') unless user?
  self = @

  @updateAsync { user: user, default: true }, { default: false }, { multi: true}
  .then ( response )->
    logger.warn "User had no default", user, id if response.n is 0
    self.findByIdAndUpdateAsync id, default: true

  .then ( response )->
    return cb "User had no default" if response.n is 0
    cb null, "Default set to id [#{id}] for user [#{user}]"
    
  .catch ( err )->
    return cb err


FilterSchema.statics.setup_initial_views_Async = ( user )->
  self = @
  new Promise ( resolve, reject )->

    views =
      mine:
        user: user
        name: 'Mine'
        field: 'owner'
        value: user
        f: { owner: user }
      all:
        user: user
        name: 'All'
        field: ''
        value: ''
        f: {}
      unack:
        user: user
        name: 'Unacknowledged'
        field: 'acknowledged'
        value: false
        default: true
        f: { acknowledged: false }
      ack:
        user: user
        name: 'Acknowledged'
        field: 'acknowledged'
        value: true
        f: { acknowledged: true }


    Promise.props
      mine:  self.createAsync(views.mine)
      all:   self.createAsync(views.all)
      unack: self.createAsync(views.unack)
      ack: self.createAsync(views.ack)
    .then ( results )->
      logger.debug results, ''
      resolve results
    .catch ( error )->
      logger.error 'FilterSchema.setup_initial_views %s', error, error.stack
      reject error

# delete filters belonging to a user
FilterSchema.statics.delete_user = ( user, cb )->
  cb new Errors.ValidationError('No user for delete') unless user?
  @remove user: user, cb

# Export the model on this
@Filters = mongoose.model 'Filters', FilterSchema

# and make it bluebird promisey
Promise.promisifyAll @Filters
Promise.promisifyAll @Filters.prototype
