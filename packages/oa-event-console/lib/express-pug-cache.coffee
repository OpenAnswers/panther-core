#
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#

# # Jade Pre Cache

# This compiles and caches all the Jade so express doesn't do it first pass

# logging modules
{debug, logger} = require('oa-logging')('oa:express:path')

glob = require 'glob'
pug = require 'pug'

options = {cache:true,compileDebug:false}

module.exports = ( pug_path ) ->
  logger.debug 'pug pre render start'
  glob "#{pug_path}/**/*.pug", { ignore: "#{pug_path}/**/test/**/*.pug" }, (err, files)->
    logger.error 'pug pre render', err if err
    logger.error 'pug pre render found no files' if files.length is 0
    files.forEach ( file )->
      #file_path = path.join __dirname, file
      file_path = file
      logger.debug 'pug pre render file', file_path
      options.filename = file_path
      pug.compileFile file_path, options

