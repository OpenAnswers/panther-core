// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
class ImportExport {
  static initClass() {
    this.uploaderInput = {};
    this.upper;
    this.validated_filename;
    this.logger = debug('oa:event:import-export');
  }

  static start() {
    return (this.upper = new ImportExport());
  }

  constructor() {
    this.upload = {};
    this.uploader = {};
    this.startit();
  }

  static saveAs() {
    return this.fetchRules({}, function (data) {
      const blob = new Blob([data], { type: 'application/yaml' });
      return saveAs(blob, 'rules.yaml');
    });
  }

  startit() {
    this.uploader = new SocketIOFileUpload(socket);
    this.uploader.useBuffer = false;

    const inputElement = $('#siofu_input')[0];

    this.uploader.listenOnInput(inputElement);
    this.uploader.addEventListener('start', function (ev) {
      ev.file.meta.operation = 'rules-import';
      return ImportExport.logger('START ev', ev);
    });

    this.uploader.addEventListener('progress', ev => ImportExport.logger('progress ev', ev));

    return this.uploader.addEventListener('error', function (ev) {
      ImportExport.logger('error ev', ev);
      if (ev.message) {
        return Message.error(ev.message);
      }
    });
  }

  static fetchRules(options, cb) {
    return socket.emit('event_rules::read::raw', { type: 'server' }, function (error, data) {
      if (error) {
        return console.error('socketio error', error.message);
      } else {
        return cb(data);
      }
    });
  }

  static validation(data) {
    return (this.validated_filename = data.filename);
  }

  static get_git_commit_msg() {
    return $('input[name=commit-msg]').val();
  }

  static activate() {
    const commit_msg = gitEnabled ? this.get_git_commit_msg() : '';

    socket.emit('event_rules::activate', { filename: this.validated_filename, commit_msg }, function (error, data) {
      if (error) {
        return Message.error(error.message);
      } else {
        return Message.info('Rules activated');
      }
    });

    return ImportExport.reset();
  }

  static reset() {
    $('#siofu_input').show();
    $('#rule-filename').text('');
    $('#rule-activate').hide();
    return $('#git-commit-msg').hide();
  }
}
ImportExport.initClass();

window.ImportExport = ImportExport;

// onload — after class definition because module scripts are deferred
$(function () {
  const IETool = ImportExport.start();

  $('#data-export.btn').on('click', () => ImportExport.saveAs());

  $('#rule-activate.btn').on('click', () => ImportExport.activate());

  // hide the activate button on the page until ready
  $('#rule-activate').hide();
  $('#git-commit-msg').hide();

  socket.on('event_rules::validation', function (validation) {
    // console.table validation
    if (validation.status === 'success') {
      $('#siofu_input').hide();
      $('#rule-activate').show();
      if (gitEnabled) {
        $('#git-commit-msg').show();
      }
      $('#rule-filename').text(validation.filename);
      ImportExport.validation(validation);
      return Message.info('Rules validated - ready to activate');
    } else if (validation.status === 'failed') {
      return Message.error(validation.msg);
    } else {
      return Message.error('Rule import failed');
    }
  });

  return socket.on('event_rules::available', function (availableRules) {
    if (availableRules.names) {
      return console.table(availableRules.names);
    }
  });
});
