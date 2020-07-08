# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


# logging
{logger, debug} = require('oa-logging')('oa:event:model:integration')

# npm modules
mongoose = require 'mongoose'
moment   = require 'moment'
Promise  = require 'bluebird'

# oa modules
config = require('../../lib/config').get_instance()


# ## Integration

# A log for Integration runs so users can have a view of that later.

IntegrationSchema = new mongoose.Schema

  created:
    type: Date
    required: true
    default: ()->
      moment().toDate()

  modified:
    type: Date
    required: true
    default: ()->
      moment().toDate()

  type:
    type: String
    required: true

  name:
    type: String
    required: true
    
  definition:
    type: Schema.Types.Mixed
    required: true


# Model promisifcation and export
Integration = mongoose.model 'Integration', IntegrationSchema
Promise.promisifyAll Integration
Promise.promisifyAll Integration.prototype
module.exports.Integration = Integration