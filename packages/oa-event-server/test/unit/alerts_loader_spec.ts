//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../mocha_helpers');

const fs = require('fs');
const os = require('os');
const path = require('path');

const mongoose = require('mongoose');

const alerts_loader = require('../../lib/alerts_loader');
const { AlertsLoader } = alerts_loader;
// ColumnDefinition isn't re-exported; reach through the module where it lives
// via a small hack — grab it off a built loader below where it's used.
// (The class is private to the module, but its behaviour is observable through
// AlertsLoader. We test it via that public surface.)

const AlertOccurrences = require('../../lib/alert_occurrences').Model;

// Shared temp dir + helper for the many definitions files the setup tests need
let tmp_dir: string;

before(function () {
  tmp_dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alerts-loader-'));
});

after(function () {
  try {
    fs.rmSync(tmp_dir, { recursive: true, force: true });
  } catch {}
});

let next_id = 0;
function write_defs(columns: any[] | undefined): string {
  const name = `defs_${Date.now()}_${next_id++}.js`;
  const file = path.join(tmp_dir, name);
  const src =
    columns === undefined ? `module.exports = {};` : `module.exports = { columns: ${JSON.stringify(columns)} };`;
  fs.writeFileSync(file, src);
  return file;
}

describe('AlertsLoader', function () {
  describe('setup', function () {
    it('loads columns from the definitions file', function (done) {
      const file = write_defs([
        { name: 'node', type: 'String', priority: 'M' },
        { name: 'severity', type: 'Number', priority: 'M' },
        { name: 'owner', type: 'String', priority: 'O' },
      ]);
      const loader = new AlertsLoader({ definitionsFile: file });
      loader.setup(function (err: any) {
        expect(err).to.equal(null);
        expect(loader.getAllColumns()).to.eql(['node', 'severity', 'owner']);
        expect(loader.getMandatoryColumns()).to.eql(['node', 'severity']);
        done();
      });
    });

    it('returns an error string when definitions.columns is missing', function (done) {
      const file = write_defs(undefined);
      const loader = new AlertsLoader({ definitionsFile: file });
      loader.setup(function (err: any) {
        expect(err).to.be.a('string');
        expect(err).to.include('missing an exports.columns');
        done();
      });
    });

    it('skips duplicate column definitions (keeps the first)', function (done) {
      const file = write_defs([
        { name: 'node', type: 'String', priority: 'M', label: 'first' },
        { name: 'node', type: 'String', priority: 'O', label: 'duplicate' },
        { name: 'other', type: 'String', priority: 'M' },
      ]);
      const loader = new AlertsLoader({ definitionsFile: file });
      loader.setup(function (err: any) {
        expect(err).to.equal(null);
        // duplicate name dropped — only 2 names total
        expect(loader.getAllColumns()).to.eql(['node', 'other']);
        // first definition wins
        expect(loader.getColumn('node').getLabel()).to.equal('first');
        done();
      });
    });

    it('is a no-op callback path when cb is omitted (no throw)', function () {
      const file = write_defs([{ name: 'only', type: 'String', priority: 'M' }]);
      const loader = new AlertsLoader({ definitionsFile: file });
      expect(() => loader.setup()).to.not.throw();
      expect(loader.getAllColumns()).to.eql(['only']);
    });
  });

  describe('accessors', function () {
    let loader: any;

    before(function (done) {
      const file = write_defs([
        { name: 'node', type: 'String', priority: 'M' },
        { name: 'severity', type: 'Number', priority: 'M' },
        { name: 'owner', type: 'String', priority: 'O' },
      ]);
      loader = new AlertsLoader({ definitionsFile: file });
      loader.setup(done);
    });

    it('getAllColumns returns every column name in declaration order', function () {
      expect(loader.getAllColumns()).to.eql(['node', 'severity', 'owner']);
    });

    it('getMandatoryColumns returns only priority === "M"', function () {
      expect(loader.getMandatoryColumns()).to.eql(['node', 'severity']);
    });

    it('getColumn returns the ColumnDefinition for a known name', function () {
      const col = loader.getColumn('severity');
      expect(col).to.exist;
      expect(col.getName()).to.equal('severity');
      expect(col.getType()).to.equal('Number');
      expect(col.isMandatory()).to.equal(true);
    });

    it('getColumn returns undefined for an unknown name', function () {
      expect(loader.getColumn('nope')).to.equal(undefined);
    });

    it('hasColumn returns true/false as appropriate', function () {
      expect(loader.hasColumn('owner')).to.equal(true);
      expect(loader.hasColumn('nope')).to.equal(false);
    });
  });

  describe('ColumnDefinition (via loader.getColumn)', function () {
    let loader: any;

    before(function (done) {
      const file = write_defs([
        { name: 'mandatory_col', type: 'String', priority: 'M', width: '120' },
        { name: 'optional_col', type: 'Number', priority: 'O', width: '80' },
        { name: 'uniq_col', type: 'String', priority: 'O', uniq: true },
        { name: 'idx_col', type: 'String', priority: 'O', idx: true },
      ]);
      loader = new AlertsLoader({ definitionsFile: file });
      loader.setup(done);
    });

    it('getWidthPX appends "px"', function () {
      expect(loader.getColumn('mandatory_col').getWidthPX()).to.equal('120px');
    });

    it('isMandatory reflects priority === "M"', function () {
      expect(loader.getColumn('mandatory_col').isMandatory()).to.equal(true);
      expect(loader.getColumn('optional_col').isMandatory()).to.equal(false);
    });

    it('toExtModel maps String → "string"', function () {
      expect(loader.getColumn('mandatory_col').toExtModel()).to.eql({ name: 'mandatory_col', type: 'string' });
    });

    it('toExtModel maps Number → "int"', function () {
      expect(loader.getColumn('optional_col').toExtModel()).to.eql({ name: 'optional_col', type: 'int' });
    });

    it('uniq and idx default to false when unspecified', function () {
      expect(loader.getColumn('mandatory_col').getUniq()).to.equal(false);
      expect(loader.getColumn('mandatory_col').getIdx()).to.equal(false);
    });

    it('uniq and idx reflect definitions when specified', function () {
      expect(loader.getColumn('uniq_col').getUniq()).to.equal(true);
      expect(loader.getColumn('idx_col').getIdx()).to.equal(true);
    });
  });

  describe('constructMongooseSchema', function () {
    it('maps each type and carries indexes/defaults through', function (done) {
      const file = write_defs([
        { name: 'a_number', type: 'Number', priority: 'O' },
        { name: 'a_date', type: 'Date', priority: 'O' },
        { name: 'a_bool', type: 'Boolean', priority: 'O' },
        { name: 'a_string', type: 'String', priority: 'O' },
        { name: 'a_unknown', priority: 'O' }, // no type
        { name: 'with_default', type: 'String', priority: 'O', default: 'hello' },
        { name: 'uniq_col', type: 'String', priority: 'O', uniq: true },
        { name: 'idx_col', type: 'String', priority: 'O', idx: true },
      ]);
      const loader = new AlertsLoader({ definitionsFile: file });
      loader.setup(function () {
        const schema = loader.constructMongooseSchema();

        expect(schema.a_number).to.eql({ type: Number });
        expect(schema.a_date).to.eql({ type: Date });
        expect(schema.a_bool).to.eql({ type: Boolean });
        expect(schema.a_string).to.eql({ type: String, default: '' });
        // Missing type falls back to String with empty default
        expect(schema.a_unknown).to.eql({ type: String, default: '' });

        // Explicit default overrides the empty-string default
        expect(schema.with_default.type).to.equal(String);
        expect(schema.with_default.default).to.equal('hello');

        // uniq → index object, idx → index true
        expect(schema.uniq_col.index).to.eql({ unique: true });
        expect(schema.idx_col.index).to.equal(true);
        done();
      });
    });
  });

  describe('registerAlertsSchema', function () {
    let loader: any;
    let Alert: any;
    let update_stub: any;

    before(function (done) {
      // The 'alerts' model name is shared with alerts.js — drop any
      // previous registration so registerAlertsSchema can re-register.
      try {
        mongoose.deleteModel('alerts');
      } catch {
        /* not registered */
      }

      update_stub = sinon
        .stub(AlertOccurrences, 'update')
        .callsFake((_c: any, _u: any, _o: any, cb: any) => cb(null, { n: 1 }));

      const file = write_defs([
        { name: 'identifier', type: 'String', priority: 'M', uniq: true },
        { name: 'node', type: 'String', priority: 'M' },
        { name: 'severity', type: 'Number', priority: 'M' },
        { name: 'owner', type: 'String', priority: 'O' },
        { name: 'acknowledged', type: 'Boolean', priority: 'O' },
        { name: 'last_occurrence', type: 'Date', priority: 'O' },
      ]);

      loader = new AlertsLoader({ definitionsFile: file });
      loader.setup(function (err: any) {
        if (err) return done(err);
        loader.registerAlertsSchema(/* db */ null, function (err2: any, model: any) {
          if (err2) return done(err2);
          Alert = model;
          done();
        });
      });
    });

    after(function () {
      if (update_stub) update_stub.restore();
    });

    it('returns a compiled "alerts" mongoose model', function () {
      expect(Alert.modelName).to.equal('alerts');
      expect(Alert).to.equal(mongoose.model('alerts'));
    });

    it('declares the column paths plus history/notes/matches sub-schemas', function () {
      const paths = Alert.schema.paths;
      expect(paths.node.instance).to.equal('String');
      expect(paths.severity.instance).to.equal('Number');
      expect(paths.history).to.exist;
      expect(paths.notes).to.exist;
      // matches is nested under {global: [...], group: [...]}
      expect(paths['matches.global']).to.exist;
      expect(paths['matches.group']).to.exist;
    });

    describe('flags virtual', function () {
      it('accumulates H, N, A and U flags', function () {
        const doc = new Alert({
          history: [{ timestamp: new Date(), user: 'u', msg: 'h' }],
          notes: [{ timestamp: new Date(), user: 'u', msg: 'n' }],
          acknowledged: true,
          owner: 'alice',
        });
        const f = doc.flags;
        expect(f).to.include('H');
        expect(f).to.include('N');
        expect(f).to.include('A');
        expect(f).to.include('U');
      });

      it('is empty when no indicators are set', function () {
        const doc = new Alert({});
        expect(doc.flags).to.equal('');
      });
    });

    describe('toClient()', function () {
      it('strips history and notes, keeps flags', function () {
        const doc = new Alert({
          node: 'n1',
          history: [{ timestamp: new Date(), user: 'u', msg: 'h' }],
          notes: [{ timestamp: new Date(), user: 'u', msg: 'n' }],
          owner: 'alice',
        });
        const out = doc.toClient();
        expect(out.node).to.equal('n1');
        expect(out.history).to.equal(undefined);
        expect(out.notes).to.equal(undefined);
        expect(out.flags).to.include('U');
      });
    });

    describe('toDetails()', function () {
      it('returns { details, notes, history, timestamps }', function () {
        const doc = new Alert({
          node: 'n1',
          notes: [{ timestamp: new Date(), user: 'u', msg: 'n' }],
          history: [{ timestamp: new Date(), user: 'u', msg: 'h' }],
        });
        const out = doc.toDetails();
        expect(out).to.have.all.keys('details', 'notes', 'history', 'timestamps');
        expect(out.notes).to.have.lengthOf(1);
        expect(out.history).to.have.lengthOf(1);
        expect(out.timestamps).to.eql([]);

        const columns = out.details.map((d: any) => d.column);
        expect(columns).to.include('node');
        expect(columns).to.not.include('history');
        expect(columns).to.not.include('notes');
      });
    });

    describe('pre("save") hook', function () {
      it('calls AlertOccurences.update keyed on identifier with $push of last_occurrence', function (done) {
        update_stub.resetHistory();
        const last = new Date(1_700_000_000_000);
        const doc = new Alert({
          identifier: 'ident-1',
          last_occurrence: last,
        });

        doc.schema.s.hooks.execPre('save', doc, function (err: any) {
          expect(err).to.not.exist;
          expect(update_stub.calledOnce).to.equal(true);
          const [conditions, update, opts] = update_stub.firstCall.args;
          expect(conditions).to.eql({ identifier: 'ident-1' });
          expect(update).to.have.property('$push');
          expect(update.$push).to.have.property('current');
          expect(update.$push.current.$each).to.eql([last]);
          expect(update.$push.current.$slice).to.equal(-1440);
          expect(opts).to.eql({ upsert: true });
          done();
        });
      });
    });
  });
});
