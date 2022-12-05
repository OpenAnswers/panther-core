/*
 * Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

// Logging
var logging = require('oa-logging')('oa:event:monitors:utils:log_tailer');
var logger = logging.logger;
var debug = logging.debug;

var fs = require('fs');

var Class = require('joose').Class;
var FileWatcher = require('./file_watcher').FileWatcher;
var FileTracker = require('./file_tracker').FileTracker;

var DEFAULT_SEPERATOR_TOKEN = '\t';
var DEFAULT_TRACKER_DIRECTORY = '/var/tmp';

/*
 * LogTailer
 * tails a file provided to constructor in logfilePath
 * on each new line calls the parse() method
 * each parsed line creates an Object which is then passed to the tokenCB
 * typically, tokenCB will be provided by the Monitor logic, which will
 * then run the Object and tokens through an associated rules file
 * which then generates an event which is sent to the server
 */
var LogTailer = (exports.LogTailer = Class({
  /*
   * originally LogTailer did:
   *  isa: FileWatcher
   * which proved problematic as it inherits from EventEmitter,
   * which in turn seems to stop the default constructor chain
   * in Joose from being called, so no after: { initialize: ... }
   * now we just instantiate an object.
   */

  has: {
    /*
     * callback to be run when tokens have been parsed out
     */
    tokenCB: { is: 'ro', required: true },
    logfilePath: { is: 'ro', required: true },
    fileTracker: { is: 'rw' },
    trackerDirectory: { is: 'ro', init: DEFAULT_TRACKER_DIRECTORY },
    watchedFile: { is: 'rw' },
  },

  after: {
    initialize: function (props) {
      var self = this;
      var unique_filename = this.getLogfilePath().replace(/\//gi, '_');
      var tracking_file = this.getTrackerDirectory() + '/' + unique_filename;

      this.setFileTracker(new FileTracker({ trackingFile: tracking_file }));

      /*
       * create the FileWatcher which will emit 'rawline' and 'read_upto' events
       */
      this.setWatchedFile(new FileWatcher({ filePath: self.getLogfilePath() }));
      logger.debug('Tracking logfile position in: ' + this.getFileTracker());
    },
  },

  methods: {
    parse: function (line) {
      /* base method - must be over ridden */
      logger.error('base class parse');
      self.getTokenCB()({ msg: 'MISSING PARSE function in overridden base class' });
    },
    start: function (started_cb) {
      var self = this;

      var watched_file = this.getWatchedFile();
      /*
       * check we have the logfile in question
       */
      var initial_stat = watched_file.check_file_exists();
      if (initial_stat) {
        /*
         * register the method be run when a new line is found in the file
         */

        watched_file.on('rawline', function (line) {
          debug('about to parse rawline', line);
          self.parse(line);
        });

        watched_file.on('read_upto', function (statd) {
          self.getFileTracker().write(statd);
        });

        /*
         * start the watcher
         */
        var intitial_offset = 0;
        if (self.getFileTracker() != undefined) {
          initial_offset = self.getFileTracker().where_to_start_from(initial_stat);
        }
        watched_file.watch(initial_offset);
      } else {
        logger.warning('logfile: [' + self.getLogfilePath() + '] does not exist');
      }
    },
  },
}));

/*
 * LogTokenizer
 * for a fixed format logfile we can provide another simple wrapper class
 * that splits on a seperator token and generates named fields based
 * upon the position in the line
 */
var LogTokenizer = (exports.LogTokenizer = Class({
  isa: LogTailer,

  has: {
    seperatorToken: { is: 'ro', init: DEFAULT_SEPERATOR_TOKEN },

    /*
     * maps position to a named field,
     * should be a plain Object with
     * key being position
     * value being name
     * e.g.
     * { 0: 'timestamp', 1: 'hostname', 2: 'daemon', 3: 'message' }
     */
    fieldMapping: { is: 'ro', required: true },
  },
  methods: {
    parse: function (line) {
      var self = this;
      var columns = line.split(self.getSeperatorToken());
      debug('var columns', columns);
      var tokens = {};

      for (var pos in columns) {
        /*
         * check if position in columns has a fieldMapping
         */
        var mapped_name = self.getFieldMapping()[pos];
        if (mapped_name) {
          tokens[mapped_name] = columns[pos];
        } else {
          logger.warn('tokenized log entry is lacking a fieldMapping at position [' + pos + ']');
          logger.debug('failed to parse line: [' + line + ']');
        }
      }

      self.getTokenCB()(tokens);
    },
  },
}));

var ComplexLogTokenizer = (exports.ComplexLogTokenizer = Class({
  isa: LogTailer,

  has: {
    isRecordTerminator: { is: 'ro', required: true },
    parseRecord: { is: 'ro', required: true },
    currentRecord: Joose.I.Array,
  },

  methods: {
    parse: function (line) {
      var self = this;

      /*
       * append the current line to the collected lines
       */
      this.currentRecord.push(line);

      /*
       * check of the last line matches the record terminator
       */

      if (this.isRecordTerminator(this.currentRecord)) {
        // record terminator found, so parse all the lines
        var tokens = this.parseRecord(this.currentRecord);

        // send the parsed tokens to the registered CB.
        if (tokens) self.getTokenCB()(tokens);

        // empty out the currentRecord
        this.currentRecord = [];
      }
    },
  },
}));
