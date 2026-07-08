//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Routes - rules

// logging
const { logger, debug } = require('oa-logging')('oa:event:routes:rules');

// npm modules
const pug = require('pug');
const router = require('express').Router();

// oa modules
const Errors = require('oa-errors');
const { EventRules, Action, Select, Option } = require('oa-event-rules');
const { Field } = require('../../lib/field');
const { _ } = require('oa-helpers');
const { rules_agent_name_schema, rules_group_name_schema } = require('../validations');

// put stuff in here!
// { Controller } = require '../controller/rules'

const config = require('../../lib/config').get_instance();

// common vars to pass to every rules page
const build_vars = function (req, override?) {
  const vars = {
    title: 'Rules',
    actions: Action.types_list(),
    selects: Select.types_list(),
    options: Option.types_list(),
    rules: req.app.locals.rules,
    fields: Field.list(),
    user: req.user,
    debug_pug: debug,
    pug,
    uuid_enabled: config.app.uuid_enabled,
    gitEnabled: config.rules.git,
    development: process.env.NODE_ENV === 'development',
  };

  if (override != null) {
    return _.defaults(override, vars);
  } else {
    return vars;
  }
};

// Protect this route
router.use(function (req, res, next) {
  if (req.user != null) {
    return next();
  } else {
    logger.error('Client tried to access console without auth session', req.sessionID);
    return res.redirect(`/?redirectUrl=${req.originalUrl}`);
  }
});

router.get('/', (req, res) => res.render('rules', build_vars(req)));

router.get('/all', (req, res) => res.render('rules', build_vars(req)));

/*
router.get '/globals', (req, res)->
  res.render 'rules-global', build_vars req,
    rules_name: 'Global Rules'
    rules_id: 'global'

router.get '/groups', (req, res)->
  res.render 'rules-groups', build_vars req,
    rules_name: 'Group Rules'
    rules_id: 'group'
*/

router.get('/globals', (req, res) =>
  res.render(
    'rules-management',
    build_vars(req, {
      rules_name: 'Global Rules',
      type: 'server',
      sub_type: 'globals',
      gitEnabled: config.rules.git,
    })
  )
);

router.get('/groups', (req, res) =>
  res.render(
    'rules-management',
    build_vars(req, {
      rules_name: 'Group Rules',
      type: 'server',
      sub_type: 'groups',
      gitEnabled: config.rules.git,
      uuid_enabled: config.app.uuid_enabled,
    })
  )
);

router.get('/group/:id', function (req, res, next) {
  const { value, error } = rules_group_name_schema.validate(req.params.id);
  if (error) {
    logger.error('Validation failure', error.message);
    return next();
  }

  const group_name = value;
  if (!(_.indexOf(config.rules.server.groups.names(), group_name) >= 0)) {
    logger.error('Invalid path accessed ', req.path);
    return next();
  }

  // FIXME/CHANGEME
  // rendering of a single group may be implmeneted in the future
  return next();

  return res.render(
    'rules-groups',
    build_vars(req, {
      type: 'server',
      sub_type: `group_${group_name}`,
      gitEnabled: config.rules.git,
    })
  );
});

router.get('/agents', (req, res) =>
  res.render(
    'rules-management',
    build_vars(req, {
      rules_name: 'Agent Rules',
      type: 'agent',
      sub_type: 'all',
      gitEnabled: config.rules.git,
    })
  )
);

router.get('/schedules', (req, res) => res.render('schedules', build_vars(req, { type: 'schedule' })));

router.get('/agent/:id', function (req, res, next) {
  let { value, error } = rules_agent_name_schema.validate(req.params.id);

  if (error) {
    logger.error('Invalid agent type ', req.path);
    return next();
  }

  // config.rules.types = ['server', 'syslogd', ...]
  error = null;
  if (!(_.indexOf(config.rules.types, value) > 0)) {
    // /rules/agent/server is probably invalid, hence indexOf > 0 being valid
    logger.error('Invalid agent type ', req.path);
    return next();
  }
  if (!config.rules[value]) {
    logger.error('Unknown agent ', req.path);
    return next();
  }

  return res.render(
    'rules-management',
    build_vars(req, {
      rules_name: `Agent ${value} Rules`,
      type: 'agent',
      sub_type: value,
      error,
      gitEnabled: config.rules.git,
    })
  );
});

router.get('/new', (req, res) => res.render('rules-new', build_vars(req)));

router.get('/info', (req, res) => res.render('rules-info', build_vars(req)));

router.get('/data/export', (req, res) => res.render('data-export', build_vars(req)));

module.exports = router;
