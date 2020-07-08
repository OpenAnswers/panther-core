# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


# logging
{ logger, debug } = require('oa-logging')('oa:event:model:user')

# npm modules
mongoose          = require 'mongoose'
Promise           = require 'bluebird'
PassportLocalMongoose = require 'passport-local-mongoose'
moment            = require 'moment'

# oa modules
Errors            = require '../../lib/errors'
{ _, random_string } = require 'oa-helpers'

config            = require('../../lib/config').get_instance()

admin_group   = 'admin'
user_group    = 'user'
read_group    = 'read'
default_group = user_group

RESET_TOKEN_LENGTH = 64

# ## User Schema

UserSchema = new mongoose.Schema

  username:
    type:     String
    required: true
    unique:   true

  email:
    type: String

  name:
    type: String

  first_name:
    type: String

  last_name:
    type: String

  group:
    type: String
    enum: [ admin_group, user_group ]
    default: default_group

  created:
    type: Date
    default: ()->
      moment().toDate()

  updated:
    type: Date
    default: ()->
      moment().toDate()

  last_login:
    type: Date
  
  failure_count:
    type: Number

  verified:
    type: Boolean
    default: false


  reset:

    token:
      type: String
      default: random_string( RESET_TOKEN_LENGTH )

    created:
      type: Date
      default: ()->
        moment().toDate()

    expires:
      type: Date
      default: ()->
        moment().add( 20, 'minutes' ).toDate()


  preferences:

    columns:
      type: [String]
      default: [
        'summary'
        'tag'
        'node'
        'owner'
        'last_occurrence'
        'first_occurrence'
        'tally'
        'group'
      ]
, {timestamps: {updatedAt: 'updated'}}


UserSchema.pre 'save', ( next )->
  @updated = moment().toDate()
  next()



# ### getUserList
UserSchema.statics.getUserList = (cb)->
  @find   login: { $exists: false }
  .select username: 1
  .sort   username: 1
  .exec   cb


# ### Check if a user is admin
UserSchema.methods.isAdministrator = ->
  this.group == admin_group


# ### generate_token( minutes )
# Generate an email token that will expire in n minutes
UserSchema.methods.generate_token = ( minutes = 20 )->
  @reset.token = random_string(64)
  @reset.created = moment().toDate()
  @reset.expires = moment().add( minutes, 'minutes' ).toDate()


# Plug passport methods into the schema
UserSchema.plugin PassportLocalMongoose, { 
  maxInterval: config.app.login.max_interval
  lastLoginField: 'last_login', 
  attemptsField: 'failure_count', 
  limitAttempts: true, 
  maxAttempts: config.app.login.max_attempts,
  interval: 500
}


# ### Read all
UserSchema.statics.read_all = ( cb )->
  @find   username: { $exists: true, $ne: '' }
  .select username: 1, group: 1, email: 1, created: 1
  .sort   username: 1
  .exec   cb


# ### Read all without admin
UserSchema.statics.read_all_minus_admin = ( cb )->
  @find   username: { $exists: true, $ne: '' }
  .select username: 1, group: 1, email: 1, created: 1
  .sort   username: 1
  .exec   cb

# ### Read one
UserSchema.statics.read_one = ( user, cb )->
  cb new Errors.ValidationError('No user for read') unless user?
  @findOne username: user, cb


# ### Create
UserSchema.statics.create_admin = ( data, cb )->
  debug 'create_admin', data

  user =   new @ data
  debug 'create_admin', data
  @registerAsync user, data.email_token
  .then ( res )->
    debug 'create_admin', err, res
    return cb err if err
    cb err, res


# ### Update
UserSchema.statics.update_data_Async = ( data, cb )->
  self=@
  new Promise ( resolve, reject )->
    debug 'findByIdAndUpdate data', data
    unless data
      reject( new Errors.ValidationError 'No user data attached')
    unless data.username?
      reject( new Errors.ValidationError 'No username field in user data', field: 'username')
    unless _.isString(data.username)
      reject( new Errors.ValidationError 'Username must be a string', field: 'username')
    unless data.username.length > 0
      reject( new Errors.ValidationError 'Username must not be empty', field: 'username', value: '')
    unless data._id?
      reject( new Errors.ValidationError 'No _id field in update data' )

    self.findByIdAndUpdateAsync data._id, data
    .then ( ret )->
      resolve( ret )
    .catch code: 11000, ( error )->
      reject new Errors.ValidationError 'A user name cannot be duplicated',
        field: 'username'
        value: data.username


# ### Delete
UserSchema.statics.delete = ( user, cb )->
  cb new Errors.ValidationError('No user for delete') unless user?
  @findOneAndRemove username: user, cb


# ### tokenExpired( token )
# Check if a reset token exists, and is expired
UserSchema.statics.tokenExpired = ( token, cb )->
  now = moment()
  @findOneAsync "reset.token": token
  .then ( user )->
    unless doc
      logger.warn "token doesn't exist [%s]", token
      return cb "token doesn't exist [#{token}]"

    if moment().isAfter() doc.email_token_expires
      logger.warn "token is expired", token, doc.email_token_expires
      return cb "token is expired [#{token}] [#{doc.email_token_expires}]"

    cb null, user

  .catch ( error )->
    logger.error error, error.stack
    cb error



# Export the promosified model
User   = mongoose.model 'User', UserSchema
Promise.promisifyAll User
Promise.promisifyAll User.prototype
module.exports =
  User: User
  RESET_TOKEN_LENGTH: RESET_TOKEN_LENGTH
