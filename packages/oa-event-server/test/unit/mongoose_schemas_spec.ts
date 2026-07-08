//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Schema-shell specs for the small model files. These modules only declare
// mongoose Schemas + register Models; the specs assert that the paths,
// indexes, and model names are what the rest of the server expects.

const { expect } = require('../mocha_helpers');

const mongoose = require('mongoose');

const Inventory = require('../../lib/inventory');
const RuleMatches = require('../../lib/rule_matches');
const AlertMatches = require('../../lib/alert_matches');
const AlertOccurrences = require('../../lib/alert_occurrences');

function index_options(schema: any, pathname: string) {
  // schema.indexes() returns [ [fields, options], ... ]
  // path.options.index can also be a boolean or an object
  const direct = schema.path(pathname);
  const combined: any = { fromPath: direct?.options?.index, fromIndexes: null };
  for (const [fields, opts] of schema.indexes()) {
    if (Object.prototype.hasOwnProperty.call(fields, pathname)) {
      combined.fromIndexes = { fields, opts };
      break;
    }
  }
  return combined;
}

describe('inventory schema', function () {
  it('has node (String, indexed) and last_seen (Date)', function () {
    const paths = Inventory.Schema.paths;
    expect(paths.node.instance).to.equal('String');
    expect(paths.last_seen.instance).to.equal('Date');

    const idx = index_options(Inventory.Schema, 'node');
    expect(idx.fromPath || idx.fromIndexes).to.be.ok;
  });

  it('registers the "Inventory" model', function () {
    expect(Inventory.Model.modelName).to.equal('Inventory');
    expect(mongoose.model('Inventory')).to.equal(Inventory.Model);
  });
});

describe('rule_matches schema', function () {
  it('has rule_uuid (String, indexed, unique) and tally (Number)', function () {
    const paths = RuleMatches.Schema.paths;
    expect(paths.rule_uuid.instance).to.equal('String');
    expect(paths.tally.instance).to.equal('Number');

    const idx = index_options(RuleMatches.Schema, 'rule_uuid');
    expect(idx.fromPath || idx.fromIndexes).to.be.ok;
    // unique: expressed via path options
    expect(paths.rule_uuid.options.unique).to.equal(true);
  });

  it('registers the "RuleMatch" model', function () {
    expect(RuleMatches.Model.modelName).to.equal('RuleMatch');
    expect(mongoose.model('RuleMatch')).to.equal(RuleMatches.Model);
  });
});

describe('alert_matches schema', function () {
  it('has identifier (String, indexed, unique), rule_uuids ([String]) and updated_at (Date)', function () {
    const paths = AlertMatches.Schema.paths;
    expect(paths.identifier.instance).to.equal('String');
    expect(paths.identifier.options.unique).to.equal(true);
    expect(paths.rule_uuids.instance).to.equal('Array');
    expect(paths.rule_uuids.caster.instance).to.equal('String');
    expect(paths.updated_at.instance).to.equal('Date');
  });

  it('sets a TTL expires option on updated_at', function () {
    const opts = AlertMatches.Schema.path('updated_at').options;
    expect(opts.expires).to.be.a('number');
    expect(opts.expires).to.be.greaterThan(0);
  });

  it('defaults updated_at to Date.now', function () {
    expect(AlertMatches.Schema.path('updated_at').defaultValue).to.equal(Date.now);
  });

  it('registers the "AlertMatch" model', function () {
    expect(AlertMatches.Model.modelName).to.equal('AlertMatch');
    expect(mongoose.model('AlertMatch')).to.equal(AlertMatches.Model);
  });
});

describe('alert_occurrences schema', function () {
  it('has identifier (String, indexed), current ([Date]) and updated_at (Date)', function () {
    const paths = AlertOccurrences.Schema.paths;
    expect(paths.identifier.instance).to.equal('String');
    expect(paths.current.instance).to.equal('Array');
    expect(paths.current.caster.instance).to.equal('Date');
    expect(paths.updated_at.instance).to.equal('Date');
  });

  it('sets a TTL expires option on updated_at', function () {
    const opts = AlertOccurrences.Schema.path('updated_at').options;
    expect(opts.expires).to.be.a('number');
    expect(opts.expires).to.be.greaterThan(0);
  });

  it('exposes an archive static method', function () {
    expect(AlertOccurrences.Schema.statics.archive).to.be.a('function');
  });

  it('registers the "AlertOccurrence" model', function () {
    expect(AlertOccurrences.Model.modelName).to.equal('AlertOccurrence');
    expect(mongoose.model('AlertOccurrence')).to.equal(AlertOccurrences.Model);
  });
});
