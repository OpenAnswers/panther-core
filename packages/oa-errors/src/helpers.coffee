# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

util  = require 'util'

# This is where all the custom errors types live.
# It makes promises easier

throw_a = ( type, message, vars... ) ->
  var_str = ''
  if vars.length > 0
    var_join = ( util.inspect(vari) for vari in vars ).join '] ['
    var_str = " [#{var_join}]"

  throw new type "#{message}#{var_str}"


module.exports.throw_a = throw_a
