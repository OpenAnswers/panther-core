//
// Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

var logging = require('oa-logging')('oa:event:server:api:settings');
var logger = logging.logger;
var debug = logging.debug;
let lodashMap = require('lodash/map');
let lodashHas = require('lodash/has');

var router = require('express').Router();

var Settings = require('../../models/settings');

let bus = require('../ipcbus').internal_bus;

router.get('/', (req, res, next) => {
  var promise = Settings.find({ owner: '_system_' }, { key: 1, value: 1, _id: 0 }).exec();
  promise
    .then(result => {
      let mapped = lodashMap(result, kv => {
        let o = {};
        o[kv.key] = kv.value;
        return o;
      });

      return res.json(mapped);
    })
    .catch(err => {
      return next(err);
    });
});
router.get('/:key', function (req, res, next) {
  var key = req.params.key;
  //console.log( 'key:', key);

  var promise = Settings.findOne({ owner: '_system_', key: key }, { key: 1, value: 1, _id: 0 }).exec();
  promise
    .then(result => {
      let o = {};
      if (result && result.key && result.value) {
        o[result.key] = result.value;
      }
      return res.json(o);
    })
    .catch(err => {
      return next(err);
    });
  /*
  Settings.findByKey(key)
  .then( function(response){
    res.json(response);
  })
  .catch( next() );
*/
});

router.post('/:key', function (req, res, next) {
  let keyValue = req.body.value || 1;
  let key = req.params.key;

  debug('POST /' + key, keyValue);

  var promise = Settings.findOneAndUpdate(
    { owner: '_system_', key: key },
    { owner: '_system_', key: key, value: keyValue },
    { new: true, upsert: true }
  ).exec();
  promise
    .then(result => {
      let o = {};
      o[key] = result.value;

      //bus.emit('/settings', o );
      bus.emit('/' + key, result.value);
      debug('POST response', o);
      return res.json(o);
    })
    .catch(err => {
      debug('caught ', err);
      return next(err);
    });
});

module.exports = router;
