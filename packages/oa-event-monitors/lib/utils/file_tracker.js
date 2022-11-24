/*
 * Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

// Logging
var logging = require('oa-logging')('oa:event:monitors:util:file_tracker');
var logger = logging.logger;
var debug = logging.debug;

var fs = require('fs');

var Class = require('joose').Class;

var DEFAULT_TRACKER_DIRECTORY = '/var/tmp';

var FileTracker = (exports.FileTracker = Class({
  has: {
    trackingFile: { is: 'rw', required: true },
    tracker: { is: 'rw' },
  },

  after: {
    initialize: function (props) {
      this.load();
    },
  },

  methods: {
    load: function () {
      var self = this;
      var tracking_file = self.getTrackingFile();
      logger.debug('Loading tracking information from: ' + tracking_file);

      try {
        var contents = fs.readFileSync(tracking_file);
        this.setTracker(JSON.parse(contents));
      } catch (err) {
        logger.warn('Tracker file is missing [' + tracking_file + ']');
      }
    },
    compare_inode: function (inode) {
      if (this.getTracker() == undefined) return false;
      if (this.getTracker().ino == undefined) return false;
      return this.getTracker().ino == inode;
    },
    compare_size: function (size) {
      if (this.getTracker() == undefined) return false;
      if (this.getTracker().size == undefined) return false;
      return this.getTracker().size == size;
    },
    compare_inode_and_size: function (inode, size) {
      if (this.compare_inode(inode)) return this.compare_size(size);
      else return false;
    },
    write: function (stat) {
      var self = this;
      fs.writeFileSync(self.getTrackingFile(), JSON.stringify(stat));
    },
    where_to_start_from: function (stat) {
      /*
       */
      if (this.getTracker() == undefined) {
        logger.debug('No tracker, will start from begining');
        return 0;
      }
      if (this.compare_inode(stat.ino) == false) {
        logger.debug('trackers inode comparison failed');
        return 0;
      }
      if (stat.size < this.getTracker().size) return stat.size;
      else return this.getTracker().size;
    },
  },
}));
