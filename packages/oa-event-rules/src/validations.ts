// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const Joi = require('joi');
const { inspect } = require('util');
const { v1: nodeuuid } = require('uuid');
const { _ } = require('oa-helpers');
const { logger, debug } = require('oa-logging')('oa:event:rules:validations');

// ### Helpers
const schema_string_or_array_of_string = Joi.alternatives(Joi.string(), Joi.array().items(Joi.string()));

// ### All selectors

const object_rule_selectors = {
  match: Joi.object()
    .messages({ 'object.base': '{{#label}} is missing match entries' })
    .pattern(Joi.string(), schema_string_or_array_of_string),
  equals: Joi.object()
    .messages({ 'object.base': '{{#label}} is missing equals entries' })
    .pattern(Joi.string(), schema_string_or_array_of_string),
  all: Joi.boolean(),
  none: Joi.boolean(),
  field_exists: Joi.string(),
  field_missing: Joi.string(),
  starts_with: Joi.object()
    .messages({ 'object.base': '{{#label}} is missing starts_with entries' })
    .pattern(Joi.string(), Joi.string()),
  ends_with: Joi.object()
    .messages({ 'object.base': '{{#label}} is missing ends_with entries' })
    .pattern(Joi.string(), Joi.string()),
  less_than: Joi.object()
    .messages({ 'object.base': '{{#label}} is missing less_than entries' })
    .pattern(Joi.string(), Joi.number()),
  greater_than: Joi.object()
    .messages({ 'object.base': '{{#label}} is missing greater_than entries' })
    .pattern(Joi.string(), Joi.number()),
  schedule: Joi.object({
    name: Joi.string().when('$schedule_names', {
      is: Joi.array().min(1).required(),
      then: Joi.valid(Joi.in('$schedule_names')).messages({ 'any.only': '{{#label}} unknown schedule name' }),
    }),
  }).messages({ 'object.base': '{{#label}} schedule was incomplete' }),
};

const schema_rule_selectors = Joi.object(object_rule_selectors)
  .messages({ 'object.base': '{{#label}} is missing a selector' })
  .or(
    'match',
    'equals',
    'all',
    'none',
    'field_exists',
    'field_missing',
    'starts_with',
    'ends_with',
    'less_than',
    'greater_than',
    'schedule'
  )
  .messages({ 'object.missing': '{{#label}} is missing a selector' });

// ### Actions

const schema_replace = Joi.object({
  field: Joi.string(),
  this: Joi.string().allow(''),
  with: Joi.string().allow(''),
}).messages({ 'object.base': '{{#label}} is missing replacements' });

const object_rule_actions = {
  replace: Joi.alternatives().try(schema_replace, Joi.array().items(schema_replace)),
  set: Joi.object().messages({ 'object.base': '{{#label}} is incomplete' }),
  discard: Joi.boolean(),
  stop: Joi.boolean(),
  stop_rule_set: Joi.boolean(),
  skip: Joi.boolean(),
};

// ### Rule
const schema_rule = Joi.object({
  name: Joi.string().min(1),
  uuid: Joi.string().guid().optional().default(nodeuuid),
})
  .keys(object_rule_selectors)
  .keys(object_rule_actions)
  // must have at least one selector
  .or(
    'match',
    'equals',
    'all',
    'none',
    'field_exists',
    'field_missing',
    'starts_with',
    'ends_with',
    'less_than',
    'greater_than',
    'schedule'
  )
  // must have at least one action
  .or('replace', 'set', 'discard', 'stop', 'stop_rule_set', 'skip');

// ### RuleSet
const schema_ruleset = Joi.object({
  rules: Joi.array().items(schema_rule),
});

// ### Group

// ### Group selector can be one of
// groups:
//   _order: [ example1 ]
//   example1:
//     rules: []
//     select:
//       all: true
//
// OR
//
// groups:
//   _order: [ example2 ]
//   example2:
//     rules: []
//     all: true
//
const schema_group = Joi.object({
  rules: Joi.array().items(schema_rule),
  uuid: Joi.string().guid().optional().default(nodeuuid()),
  select: schema_rule_selectors,
})
  .concat(Joi.object(object_rule_selectors))
  .when(Joi.object({ select: Joi.exist() }).unknown(), {
    then: Joi.object()
      .required()
      .without('select', [
        'match',
        'equals',
        'all',
        'none',
        'field_exists',
        'field_missing',
        'starts_with',
        'ends_with',
        'less_than',
        'greater_than',
        'schedule',
      ])
      .messages({
        'object.without': '{{#label}} Can not have both a select: block, AND rule selectors',
      }),
    otherwise: Joi.object().or(
      'match',
      'equals',
      'all',
      'none',
      'field_exists',
      'field_missing',
      'starts_with',
      'ends_with',
      'less_than',
      'greater_than',
      'schedule'
    ),
  });

// ### Groups

// validates entries in _order exist as groups[names]
// validates groups[names] exist in _order
// NOTE: requires a context object to `.validate( obj,{ context: {ordered_groups: [String...], group_keys: [String...] }})
const schema_groups = Joi.object({
  _order: Joi.array()
    .required()
    .items(
      Joi.string()
        .pattern(/^\s+|\s+$/, { invert: true })
        .when('$group_keys', {
          is: Joi.array().min(1).required(),
          then: Joi.valid(Joi.in('$group_keys')).messages({
            'any.only': '{{#label}} has no corresponding entry under groups:',
          }),
        })
    ),
})
  .pattern(
    Joi.string()
      .pattern(/^\s+|\s+$/, { invert: true })
      .when('$ordered_groups', {
        // when() context has non empty $ordered_groups
        is: Joi.array().min(1).required(),
        // then cross reference keys with it
        then: Joi.valid(Joi.in('$ordered_groups')),
      }),
    schema_group
  )
  .messages({
    'object.unknown': '{{#label}} Does not exist in _order:[]',
    'string.pattern.invert.base': '{{#label}} can not begin or end with whitespace',
  });

// ### Schedule

const schema_schedule = Joi.object({
  name: Joi.string()
    .regex(/^[a-zA-Z0-9_\- ]+$/)
    .required(),
  uuid: Joi.string().guid().optional().default(nodeuuid()),
  start: Joi.string()
    .regex(/^[012][0-9]:[0-5][0-9]$/)
    .required(),
  end: Joi.string()
    .regex(/^[012][0-9]:[0-5][0-9]$/)
    .required(),
  days: Joi.array().items(
    Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
  ),
})
  .unknown(false)
  .messages({ 'object.unknown': 'Property {{#label}} is not permitted in schedule' });

const schema_server_rules = Joi.object({
  globals: schema_ruleset,
  groups: schema_groups,
  schedules: Joi.array().items(schema_schedule),
  hash: Joi.string()
    .regex(/[0-9a-z]+/)
    .optional(),
  metadata: Joi.object({
    save_date: Joi.number().positive(),
  }),
})
  .messages({ 'object.base': '{{#label}} is not a well formed YAML rules file' })
  .unknown(false)
  .messages({ 'object.unknown': 'Property {{#label}} is not permitted' });

// Compile schemas

const compiled_rule = Joi.compile(schema_rule);
const compiled_ruleset = Joi.compile(schema_ruleset);
const compiled_group = Joi.compile(schema_group);
const compiled_groups = Joi.compile(schema_groups);
const compiled_schedule = Joi.compile(schema_schedule);
const compiled_server_rules = Joi.compile(schema_server_rules);

// helper methods

// ### returns [String...] of messages
var joi_error_summary = function (error) {
  const messages = [];

  if (error.details) {
    for (var err of Array.from(error.details)) {
      if (err.message) {
        messages.push(err.message);
      }
      if (err.context) {
        messages.push(joi_error_summary(err.context).flat());
      }
    }
  }
  return messages.flat(2);
};

// Full validation of `server.rules.yml` `:groups: {}` needs access to the schedule names to verify
const validate_server_groups_section = function (yaml_def, schedule_names) {
  // first pass validates the general structure
  if (schedule_names == null) {
    schedule_names = [];
  }
  const { error, value } = compiled_groups.validate(yaml_def, { context: { schedule_names: [] } });
  if (error) {
    return { error, value };
  }

  const group_keys = _.chain(value)
    .keys()
    .filter(key => key !== '_order')
    .value();
  const ordered_groups = _.clone(value._order);

  // second pass, full validation with context
  return compiled_groups.validate(yaml_def, {
    context: {
      group_keys,
      ordered_groups,
      schedule_names,
    },
  });
};

// Given a `server.rules.yml` file, Joi will validate it.
// There are some interdepencies between some of the validations,
// Entries under the following must be cross referenced
//    groups: { _order: [], keys: values... }
// `keys` must be included in _order: [keys...]
// `_order: [keys]` must also be keys under `groups:{}`
const validate_server_rules = function (yaml_def) {
  // first pass: ensures general structure is correct.
  // empty context values ensures full validation is skipped
  const { error, value } = schema_server_rules.validate(yaml_def, {
    context: {
      schedule_names: [],
      group_keys: [],
      ordered_groups: [],
    },
  });

  if (error) {
    logger.debug('Validation Failed - server.rules.yml (naive)');
    return { error, value };
  }

  // extract out values from naive validation to provide context for full validation later
  const ordered_groups = _.clone(value.groups._order);
  debug('server.rules.yml: ordered_groups ', ordered_groups);

  const group_keys = _.chain(value.groups)
    .keys()
    .filter(key => key !== '_order')
    .value();
  debug('server.rules.yml: group_keys ', group_keys);

  const schedule_names = _.chain(value.schedules)
    .map(schedule => schedule.name)
    .value();
  debug('server.rules.yml: schedule_names ', schedule_names);

  // second pass: cross references group names and schedule names
  return compiled_server_rules.validate(yaml_def, {
    context: {
      group_keys,
      ordered_groups,
      schedule_names,
    },
    abortEarly: false,
  });
};

//
module.exports = {
  rule_validator: compiled_rule,
  ruleset_validator: compiled_ruleset,
  group_validator: compiled_group,
  groups_validator: compiled_groups,
  schedule_validator: compiled_schedule,
  server_rules_validator: compiled_server_rules,
  validate_server_rules,
  validate_server_groups_section,
  joi_error_summary,
};
