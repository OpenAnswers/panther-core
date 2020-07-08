
# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# # CertificateSchema

# This is the certificate schema. It stores certificates for a console
# Stores complete data as well as the path to the local store


# logging
{logger, debug} = require('oa-logging')('oa:event:model:certificate')

# npm modules
Promise    = require 'bluebird'
mongoose   = require 'mongoose'
moment     = require 'moment'
_          = require 'lodash'

# oa modules
Errors     = require '../../lib/errors'

# ## Schema Certificate

CertificateSchema = new mongoose.Schema

  # Common name of the certificate
  name:
    type: String
    required: true

  # Local file path
  file:
    type: String
    required: true

  # Cert base64 string
  cert:
    type: String
    required: true

  # Key base64 string
  key:
    type: String
    required: true

  # Console user who created it
  created_by:
    type: String
    required: true

  # When
  created_at:
    type: Date
    default: ()->
      moment().toDate()
    required: true

  # Until
  expires_at:
    type: Date
    default: ()->
      moment().add(2, 'years').toDate()
    required: true

  # Removed
  disabled_at:
    type: Date


# Add some dates if they don't exist
# CertificateSchema.pre 'save', ( next )->
#   unless @created_at
#     @created_at = moment().toDate()
#   unless @expires_at
#     @expires_at = moment().add(730, 'days').toDate()


# Update
CertificateSchema.statics.delete = ( data, cb )->
  debug 'delete', data
  unless data
    return cb new Errors.ValidationError('No data for delete')
  unless data.id?
    return cb new Errors.ValidationError('No id field in delete data')
  unless data.name?
    return cb new Errors.ValidationError('No name field in delete data')

  @findOneAndRemove( _id: data.id, name: data.name, cb )


# Update
CertificateSchema.statics.findName = ( name, cb )->
  debug 'findName'

  @findOneAsync( name: name )
  .then ( docs )->
    found = false
    found = true if docs
    debug 'found', found, docs
    cb null, found

  .catch ( error )->
    cb "#{error}"


# getKey
CertificateSchema.statics.getKey = ( id, cb )->
  debug 'getKey'

  @findOneAsync( _id: id )
  .then ( doc )->
    unless doc
      return cb "No key found for #{id}"
    cb null,
      cert: doc.key
      name: doc.name

  .catch ( error )->
    cb "#{error}"


# getCert
CertificateSchema.statics.getCert = ( id, cb )->
  debug 'getCert'

  @findOneAsync( _id: id )
  .then ( doc )->
    unless doc
      return cb "No cert found for #{id}"
    cb null, 
      cert: doc.cert
      name: doc.name

  .catch ( error )->
    cb "#{error}"


# Update
CertificateSchema.statics.findForConsole = ( cb )->
  debug 'findForConsole'

  @find().sort( name: 'asc' ).select('-cert -key').execAsync()
  .then ( docs )->
    debug 'find sort select'
    cb null, docs

  .catch ( error )->
    cb "#{error}"


# Export the model
Certificate = mongoose.model 'Certificate', CertificateSchema

# and make it bluebird promisey
Promise.promisifyAll Certificate
Promise.promisifyAll Certificate.prototype
module.exports.Certificate = Certificate
