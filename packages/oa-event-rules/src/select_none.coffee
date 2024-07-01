# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# # Select: No Events

# logging
{ logger, debug } = require('oa-logging')('oa:event:rules:select:none')

# OA modules
{ throw_error, _ } = require 'oa-helpers'

{ SelectBaseSingle } = require './select_base'


# None matches nothing.
class @SelectNone  extends SelectBaseSingle
  
  @label: 'none'

  run: ->
    debug @constructor.name
    false
