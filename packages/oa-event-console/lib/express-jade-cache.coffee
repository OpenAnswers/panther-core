# # Jade Pre Cache

# This compiles and caches all the Jade so express doesn't do it first pass

# logging modules
{debug, logger} = require('oa-logging')('oa:express:path')

glob = require 'glob'
jade = require 'jade'

options = {cache:true,compileDebug:false}

module.exports = ( jade_path ) ->
  logger.debug 'jade pre render start'
  glob "#{jade_path}/**/*.jade", (err, files)->
    logger.error 'jade pre render', err if err
    logger.error 'jade pre render found no files' if files.length is 0
    files.forEach ( file )->
      #file_path = path.join __dirname, file
      file_path = file
      logger.info 'jade pre render file', file_path
      options.filename = file_path
      jade.compileFile file_path, options

