//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # ImportExport

// logging modules
const { RequestLogger,
  logger,
  debug }         = require('oa-logging')('oa:event:import-export');

// npm modules
const Promise           = require('bluebird');
const siofu             = require('socketio-file-upload');
const moment            = require('moment');
const { copy, move, remove } = require('fs-extra');
const fs                = require('fs');

const del               =require('del');

// Config before OA
const config            = require('./config').get_instance();

// OA modules
const Errors            = require('./errors');
const { server_event }  = require('./eventemitter');

const { EventRules }    = require('oa-event-rules');


// ## Class ImportExport

class ImportExport {

  static compare_files(pathA, pathB){
    const statA = fs.statSync(pathA);
    const statB = fs.statSync(pathB);
    if (statA.size !== statB.size) { return false; }

    const fdA = fs.openSync(pathA, 'r');
    const fdB = fs.openSync(pathB, 'r');
    const bufA = Buffer.alloc(6 * 1024);
    const bufB = Buffer.alloc(6 * 1024);

    let readA = 1;
    let readB = 1;

    while (readA > 0) {
      readA = fs.readSync(fdA, bufA, 0, bufA.length, null);
      readB = fs.readSync(fdB, bufB, 0, bufB.length, null);

      if (readA !== readB) { return false; }

      for (var i = 0, end = readA, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
        if (bufA[i] !== bufB[i]) { return false; }
      }
    }

    fs.closeSync(fdA);
    fs.closeSync(fdB);
    return true;
  }


  static switch_to_imported(importedPath, opts){
    opts ??= {};
    // debug "switch to imported opts: ", opts

    const currentRulesPath = config.rules_path("server");
    const backoutRulesPath = config.rules_path("server") + ".bak";

    logger.info(`RULES current ${currentRulesPath}, new ${importedPath}`);

    // take backup copy of current
    return copy(currentRulesPath, backoutRulesPath)
    .then(function() {
      if (ImportExport.compare_files(currentRulesPath, importedPath)) {
        throw new Errors.ValidationError("import aborted - files are the same");
      }}).then(() => // install the import
    copy(importedPath, currentRulesPath)
    .then(function() {
      // git commit?
      let imported_msg = "imported";
      const { commit_msg } = opts;
      if (commit_msg) { 
        imported_msg += " " + commit_msg;
      }

      return EventRules.git_commit_and_push(currentRulesPath, imported_msg, opts);}).then(function() {
      logger.info("Imported rules were installed");
      debug('removing temporary imported file ', importedPath);
      ImportExport.remove_temporary_imports(importedPath);
    
      return {success: true};}).catch(function(err){
      // rollback on failure
      logger.error("restoring backout rules: ", err);
      copy(backoutRulesPath, currentRulesPath)
      .catch(berr => logger.error("backout failed: ", berr));
      
      ImportExport.remove_temporary_imports(importedPath);
      throw new Errors.SocketError("import failed - rolling back");
    }));
  }

  static remove_temporary_imports(importedPath){
    logger.info("Deleteing ", importedPath);
    return del(importedPath, { cwd: config.app.upload.directory })
    .then(function(deletedFiles) {
      const deletedPaths = deletedFiles.join(', ');
      return logger.info(`Deleted rule import [${deletedPaths}]`);}).catch(deletetionErrors => logger.error("Failed to remove imported rule ", deletetionErrors.message));
  }



  static init_importer(socket){
    const self = this;

//    socket.on "event_rules::activate", (payload, cb)->
//      filename = payload.filename


    // register uploader
    const uploader = new siofu();
    uploader.dir = config.app.upload.directory;
    uploader.maxFileSize = config.app.upload.maxsize;

    uploader.on("error", ev => logger.error("SIOFU ", ev.file.name, ev.error.message));
    uploader.on("progress", ev => logger.info("SIOFU loaded ", ev.file.bytesLoaded));
      
    // Remove any existing saved listener to prevent duplicates
    uploader.removeAllListeners("saved");

    uploader.on("saved", function(ev){
      logger.info("User [%s] uploaded new rules [%s], success: ", socket.ev.user(), ev.file.name,ev.file.success);
      debug("SIOFU saved: ", ev);
      try {
        // suggested filename my conflict, siofu could have renamed it
        // pathName will be the actual full path to file on disk
        const uploadedPath = ev.file.pathName;
        if (!uploadedPath) { throw new Errors.ValidationError('No file found'); }
        if (ev.file.size <= 0) { throw new Errors.ValidationError('Empty file'); }

        const rulesDoc = EventRules.load(uploadedPath);

        // validate rules
        //eventRules = new EventRules reload_rules: false, path: uploadedPath, server: true
        const eventRules = new EventRules({reload_rules: false, doc: rulesDoc, server: true});

        return socket.emit("event_rules::validation", {
          status: "success",
          msg: "rules accepted",
          filename: ev.file.name
        }
        );

//        self.switch_to_imported uploadedPath
//        .then ->
//          socket.emit "event_rules::imported",
//            status: "success"
//            msg: "rules imported"


      } catch (error) {
        logger.error("RULES failed", error.message);
        socket.emit("event_rules::validation", { 
          status: "failed", 
          msg: "incorrect file: " + error.message
        }
        );
        return debug('removing failed import');
      }


      finally {
        // cleanup uploaded file
        logger.debug(`will unlink: ${ev.file.pathName}`);
      }
    });

    // file uploaded is validates the request and generates a new filename
    uploader.uploadValidator = function(ev,finished){
      if (ev.file.meta?.operation !== "rules-import") {
        return finished(false);
      } else {
        //rename the file
        const timestamp = moment().format("YYYY-MM-DD-HH-mm-ss");
        ev.file.name = "server.rules." + timestamp + ".yml";
        return finished(true);
      }
    };

    return uploader.listen(socket);
  }
}

            

module.exports.ImportExport = ImportExport;
