# # Inventory Schema

# ### Modules

# Logging
{logger, debug} = require('oa-logging')('oa:event:model:inventory')

# Npm modules
mongoose = require 'mongoose'
moment   = require 'moment'
Promise  = require 'bluebird'

# OA modules
{ SocketIO }      = require "../../lib/socketio"


# ------------------
# ## Schema

# Activity 
InventorySchema = new mongoose.Schema
  
  # Time the activity took place
  last_seen:
    type:     Date
    default:  () -> moment().toDate()
    required: true

  # The username associated with the activity
  node:
    type:     String
    required: true

# ----------------

# ## Events

# Ensure we have the current date attached
InventorySchema.pre 'save', (next) ->
  unless @last_seen
    @last_seen = moment().toDate()
  next()

# Propogate activity out to any users that are listening
# NOTE: this will only work on a document.remove() and not Model.remove()
InventorySchema.post 'remove', (doc) ->
  if SocketIO.io?.to
    SocketIO.io.to('inventory').emit('deleted', doc)


# ### Export
# Model promisifcation and export
Inventory = mongoose.model 'Inventory', InventorySchema
Promise.promisifyAll Inventory
Promise.promisifyAll Inventory.prototype
module.exports.Inventory = Inventory
