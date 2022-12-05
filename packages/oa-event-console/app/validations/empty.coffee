# 
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

Joi = require '@hapi/joi'

empty_schema = Joi.object({})

module.exports = 
    empty_schema: empty_schema
