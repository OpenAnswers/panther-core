# 
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


# logging
{logger, debug} = require('oa-logging')('oa:event:model:severity')

# npm modules
mongoose = require 'mongoose'
Promise  = require 'bluebird'

# # SeveritySchema

# This is the severity schema. It stores the list of severities for the system

SeveritySchema = new mongoose.Schema

  # The integer value for the Severity
  # 0 being the lowest
  value:
    type:     Number

  # A text label for the severity
  label:
    type:     String
  
  # A bacground hex RGB colour
  background:
    type:     String

  # A foreground hex RGB colour
  foreground:
    type:     String
  
  # OAMon legacy
  system:
    type:     Boolean
    default:  false



# Just get the labels and values
SeveritySchema.statics.getLabels = ()->
  @find   system: true
  .select value:  1, label:1
  .sort   value: -1
  .exec() 

# Get the label, value and colour
SeveritySchema.statics.getSeveritiesWithId = ()->
  @find   system: true
  .select _id: 1, value:  1, label: 1, background: 1
  .sort   value: -1
  .exec()


# Export and Promisify the model
Severity   = mongoose.model 'Severity', SeveritySchema
#Promise.promisifyAll Severity
#Promise.promisifyAll Severity.prototype
module.exports.Severity = Severity
