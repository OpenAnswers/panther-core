//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Journey — AlertDefinition schema statics + pre-save hook against an
// in-memory mongo. The unit spec only asserts that the schema, statics and
// hook are *registered*; this spec exercises them so that real behaviour
// (priority filtering, type→ext-type mapping, display_type defaulting) is
// covered.

const { expect } = require('../mocha_helpers');
const { useMongo } = require('../helpers/mongo');

const AlertDefinition = require('../../lib/alertdefinition');
const Model = AlertDefinition.Model;

describe('[integration] AlertDefinition statics', function () {
  this.timeout(30_000);
  useMongo(this);

  describe('display_type fallback', function () {
    // The schema declares a `display_type` getter that returns `dt || this.type`,
    // which makes the pre-save hook (`if (!this.display_type) this.display_type = this.type`)
    // a no-op — `this.display_type` already returns `this.type` via the getter,
    // so the assignment never fires. Documented behaviour: nothing is persisted
    // for display_type unless explicitly set; the getter supplies the fallback at read time.

    it('getter returns type when display_type is not stored', async function () {
      await new Model({ column: 'severity', type: 'Number' }).save();
      const doc = await Model.findOne({ column: 'severity' });
      expect(doc.display_type).to.equal('Number');
      // raw stored value is absent — confirms the pre-save hook does not persist anything
      const raw = await Model.findOne({ column: 'severity' }).lean();
      expect(raw.display_type).to.be.undefined;
    });

    it('preserves an explicitly-set display_type', async function () {
      await new Model({ column: 'last_occurrence', type: 'Number', display_type: 'Date' }).save();
      const fresh = await Model.findOne({ column: 'last_occurrence' }).lean();
      expect(fresh.display_type).to.equal('Date');
    });
  });

  describe('static methods', function () {
    beforeEach(async function () {
      await Model.create([
        { column: 'identifier', type: 'String', priority: 'M', width: '120' },
        { column: 'node', type: 'String', priority: 'M', width: '100' },
        { column: 'summary', type: 'String', priority: 'O', width: '200' },
        { column: 'severity', type: 'Number', priority: 'M', width: '60' },
        { column: 'last_occurrence', type: 'Number', display_type: 'Date', priority: 'O', width: '140' },
      ]);
    });

    it('getDefaultLayout returns {field, width} for every row', function (done) {
      Model.getDefaultLayout(function (rows: any[]) {
        try {
          expect(rows).to.be.an('array').with.lengthOf(5);
          for (const r of rows) {
            expect(r).to.have.all.keys(['field', 'width']);
          }
          const fields = rows.map(r => r.field);
          expect(fields).to.have.members(['identifier', 'node', 'summary', 'severity', 'last_occurrence']);
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('getMandatoryColumns returns only priority="M" columns', function (done) {
      Model.getMandatoryColumns(function (err: any, cols: string[]) {
        try {
          expect(err).to.be.null;
          expect(cols).to.have.members(['identifier', 'node', 'severity']);
          expect(cols).to.not.include('summary');
          expect(cols).to.not.include('last_occurrence');
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('getAllowedColumns returns every column', function (done) {
      Model.getAllowedColumns(function (err: any, cols: string[]) {
        try {
          expect(err).to.be.null;
          expect(cols).to.have.members(['identifier', 'node', 'summary', 'severity', 'last_occurrence']);
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('toExtModelFields maps String→string, Number→int, Number+Date→date', function (done) {
      Model.toExtModelFields(function (err: any, rows: Array<{ name: string; type: string }>) {
        try {
          expect(err).to.be.null;
          const by_name = Object.fromEntries(rows.map(r => [r.name, r.type]));
          expect(by_name.identifier).to.equal('string');
          expect(by_name.node).to.equal('string');
          expect(by_name.summary).to.equal('string');
          expect(by_name.severity).to.equal('int');
          expect(by_name.last_occurrence).to.equal('date');
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });
});
