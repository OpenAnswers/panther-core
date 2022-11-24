#
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#

# # ImportExport

# logging modules
{ RequestLogger
  logger
  debug }         = require('oa-logging')('oa:event:import-export')

# npm modules
Promise           = require 'bluebird'
siofu             = require 'socketio-file-upload'
moment            = require 'moment'
{ copy, move, remove } = require 'fs-extra'

del               =require 'del'

# Config before OA
config            = require('./config').get_instance()

# OA modules
Errors            = require './errors'
{ server_event }  = require './eventemitter'

{ EventRules }    = require 'oa-event-rules'


# ## Class ImportExport

class ImportExport

  @switch_to_imported: (importedPath, opts = {})->
    currentRulesPath = config.rules_path("server")
    backoutRulesPath = config.rules_path("server") + ".bak"

    logger.info "RULES current #{currentRulesPath}, new #{importedPath}"

    # take backup copy of current
    copy currentRulesPath, backoutRulesPath
    .then ->
      # install the import
      copy importedPath, currentRulesPath
      .then ->
        # git commit?
        EventRules.git_commit_and_push currentRulesPath, "imported", opts
      .then ->
        logger.info "Imported rules were installed"
        debug 'removing temporary imported file ', importedPath
        ImportExport.remove_temporary_imports importedPath
      
        success: true

      .catch (err)->
        # rollback on failure
        logger.error "restoring backout rules: ", err
        copy backoutRulesPath, currentRulesPath
        .catch (berr)->
          logger.error "backout failed: ", berr
        
        ImportExport.remove_temporary_imports importedPath
        throw new Errors.SocketError "import failed - rolling back"

  @remove_temporary_imports: (importedPath)->
    logger.info "Deleteing ", importedPath
    del importedPath, { cwd: config.app.upload.directory }
    .then (deletedFiles) ->
      deletedPaths = deletedFiles.join(', ');
      logger.info "Deleted rule import [#{deletedPaths}]"
    .catch (deletetionErrors) ->
      logger.error "Failed to remove imported rule ", deletetionErrors.message



  @init_importer: (socket)->
    self = @

#    socket.on "event_rules::activate", (payload, cb)->
#      filename = payload.filename


    # register uploader
    uploader = new siofu()
    uploader.dir = config.app.upload.directory
    uploader.maxFileSize = config.app.upload.maxsize

    uploader.on "error", (ev)->
      logger.error "SIOFU ", ev.file.name, ev.error.message
    uploader.on "progress", (ev)->
      logger.info "SIOFU loaded ", ev.file.bytesLoaded

    uploader.on "saved", (ev)->
      logger.info "User [%s] uploaded new rules [%s], success: ", socket.ev.user(), ev.file.name,ev.file.success
      debug "SIOFU meta ", ev.file.meta
      try
        # suggested filename my conflict, siofu could have renamed it
        # pathName will be the actual full path to file on disk
        uploadedPath = ev.file.pathName

        rulesDoc = EventRules.load uploadedPath

        # validate rules
        #eventRules = new EventRules reload_rules: false, path: uploadedPath, server: true
        eventRules = new EventRules reload_rules: false, doc: rulesDoc, server: true

        socket.emit "event_rules::validation",
          status: "success"
          msg: "rules accepted"
          filename: ev.file.name

#        self.switch_to_imported uploadedPath
#        .then ->
#          socket.emit "event_rules::imported",
#            status: "success"
#            msg: "rules imported"


      catch error
        logger.error "RULES failed", error.message
        socket.emit "event_rules::validation", 
          status: "failed", 
          msg: "incorrect file format"
        debug 'removing failed import'


      finally
        # cleanup uploaded file
        logger.debug "will unlink: #{ev.file.pathName}"

    # file uploaded is validates the request and generates a new filename
    uploader.uploadValidator = (ev,finished)->
      if ev.file.meta is not "rules-import"
        finished false
      else
        #rename the file
        timestamp = moment().format("YYYY-MM-DD-HH-mm-ss")
        ev.file.name = "server.rules." + timestamp + ".yml"
        finished true

    uploader.listen socket

            

module.exports.ImportExport = ImportExport
