//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// logging
const { logger, debug } = require('oa-logging')('oa:event:model:filters');

// npm modules
const Promise: any = require('bluebird');
const mongoose = require('mongoose');

// oa modules
const Errors = require('../../lib/errors');

// # FilterSchema

// This is the filter schema. It stores filters for users
// It may store default filters as well

const FilterSchema = new mongoose.Schema({
  // User the filter is associated with
  user: {
    type: String,
  },

  // Name of the filter
  name: {
    type: String,
    required: true,
  },

  field: {
    type: String,
  },
  //required: true

  value: {
    type: String,
  },
  //required: true

  // f is the filter.. why not filter?
  // This is used as a mongo filter object
  f: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  default: {
    type: Boolean,
    default: false,
  },

  created_at: {
    type: Date,
  },

  modified_at: {
    type: Date,
  },

  // Is the filter system or not
  system: {
    type: Boolean,
    default: false,
  },
})
  .pre('save', function (next) {
    if (this.created_at == null) {
      this.created_at = new Date();
    }
    return next();
  })
  .pre('save', function (next) {
    this.modified_at = new Date();
    return next();
  });

// Check if we already have this name
// .pre 'save', ( next ) ->
//   next()

// Update
//# returns a `Promise` which resolves to the updates Filter or a rejects with an Error
//# @return {Promise}
FilterSchema.statics.update_data = function (data) {
  const self = this;
  debug('findByIdAndUpdate data', data);

  if (data._id == null) {
    return Promise.reject(new Errors.ValidationError('No _id field in update data'));
  }
  if (data.name == null) {
    return Promise.reject(new Errors.ValidationError('No name field in update data'));
  }

  data.name = `${data.name}`;

  return this.findByIdAndUpdate(data._id, data);
};

// Set default
FilterSchema.statics.set_default = function (user, id) {
  debug('set_default view', user, id);

  if (id == null) {
    return Promise.reject(new Errors.ValidationError('No id in update data'));
  }
  if (user == null) {
    return Promise.reject(new Errors.ValidationError('No user in update data'));
  }
  const self = this;

  return this.update({ user, default: true }, { default: false }, { multi: true })
    .then(function (response) {
      if (response.n === 0) {
        logger.warn('User had no default', user, id);
      }
      return self.findByIdAndUpdate(id, { default: true });
    })
    .then(function (response) {
      if (response.n === 0) {
        Promise.reject('User had no default');
      }
      return `Default set to id [${id}] for user [${user}]`;
    });
};

FilterSchema.statics.setup_initial_views = function (user) {
  const self = this;
  return new Promise(function (resolve, reject) {
    const views = {
      mine: {
        user,
        name: 'Mine',
        field: 'owner',
        value: user,
        f: { owner: user },
      },
      all: {
        user,
        name: 'All',
        field: '',
        value: '',
        f: {},
      },
      unack: {
        user,
        name: 'Unacknowledged',
        field: 'acknowledged',
        value: false,
        default: true,
        f: { acknowledged: false },
      },
      ack: {
        user,
        name: 'Acknowledged',
        field: 'acknowledged',
        value: true,
        f: { acknowledged: true },
      },
    };

    return Promise.props({
      mine: self.create(views.mine),
      all: self.create(views.all),
      unack: self.create(views.unack),
      ack: self.create(views.ack),
    })
      .then(function (results) {
        logger.debug(results, '');
        return resolve(results);
      })
      .catch(function (error) {
        logger.error('FilterSchema.setup_initial_views %s', error, error.stack);
        return reject(error);
      });
  });
};

// delete filters belonging to a user
FilterSchema.statics.delete_user = function (user) {
  if (user == null) {
    return Promise.reject(new Errors.ValidationError('No user for delete'));
  }
  return this.deleteOne({ user });
};

// Export the model
const Filters = mongoose.model('Filters', FilterSchema);
module.exports.Filters = Filters;

// and make it bluebird promisey
