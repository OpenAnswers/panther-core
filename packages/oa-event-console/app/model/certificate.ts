//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # CertificateSchema

// This is the certificate schema. It stores certificates for a console
// Stores complete data as well as the path to the local store

// logging
const { logger, debug } = require('oa-logging')('oa:event:model:certificate');

// npm modules
const Promise = require('bluebird');
const mongoose = require('mongoose');
const moment = require('moment');
const _ = require('lodash');

// oa modules
const Errors = require('../../lib/errors');

// ## Schema Certificate

const CertificateSchema = new mongoose.Schema({
  // Common name of the certificate
  name: {
    type: String,
    required: true,
  },

  // Local file path
  file: {
    type: String,
    required: true,
  },

  // Cert base64 string
  cert: {
    type: String,
    required: true,
  },

  // Key base64 string
  key: {
    type: String,
    required: true,
  },

  // Console user who created it
  created_by: {
    type: String,
    required: true,
  },

  // When
  created_at: {
    type: Date,
    default() {
      return moment().toDate();
    },
    required: true,
  },

  // Until
  expires_at: {
    type: Date,
    default() {
      return moment().add(2, 'years').toDate();
    },
    required: true,
  },

  // Removed
  disabled_at: {
    type: Date,
  },
});

// Add some dates if they don't exist
// CertificateSchema.pre 'save', ( next )->
//   unless @created_at
//     @created_at = moment().toDate()
//   unless @expires_at
//     @expires_at = moment().add(730, 'days').toDate()

// Update
CertificateSchema.statics.delete = function (data, cb) {
  debug('delete', data);
  if (!data) {
    return cb(new Errors.ValidationError('No data for delete'));
  }
  if (data.id == null) {
    return cb(new Errors.ValidationError('No id field in delete data'));
  }
  if (data.name == null) {
    return cb(new Errors.ValidationError('No name field in delete data'));
  }

  return this.findOneAndRemove({ _id: data.id, name: data.name }, cb);
};

// Update
CertificateSchema.statics.findName = function (name, cb) {
  debug('findName');

  return this.findOne({ name })
    .then(function (docs) {
      let found = false;
      if (docs) {
        found = true;
      }
      debug('found', found, docs);
      return cb(null, found);
    })
    .catch(error => cb(`${error}`));
};

// getKey
CertificateSchema.statics.getKey = function (id, cb) {
  debug('getKey');

  return this.findOne({ _id: id })
    .then(function (doc) {
      if (!doc) {
        return cb(`No key found for ${id}`);
      }
      return cb(null, {
        cert: doc.key,
        name: doc.name,
      });
    })
    .catch(error => cb(`${error}`));
};

// getCert
CertificateSchema.statics.getCert = function (id, cb) {
  debug('getCert');

  return this.findOne({ _id: id })
    .then(function (doc) {
      if (!doc) {
        return cb(`No cert found for ${id}`);
      }
      return cb(null, {
        cert: doc.cert,
        name: doc.name,
      });
    })
    .catch(error => cb(`${error}`));
};

// Update
CertificateSchema.statics.findForConsole = function (cb) {
  debug('findForConsole');

  return this.find()
    .sort({ name: 'asc' })
    .select('-cert -key')
    .execAsync()
    .then(function (docs) {
      debug('find sort select');
      return cb(null, docs);
    })
    .catch(error => cb(`${error}`));
};

// Export the model
const Certificate = mongoose.model('Certificate', CertificateSchema);

// and make it bluebird promisey
Promise.promisifyAll(Certificate);
Promise.promisifyAll(Certificate.prototype);
module.exports.Certificate = Certificate;
