//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Journey — Severity schema statics against an in-memory mongo. The unit spec
// covers the schema declaration; this spec exercises the two statics so the
// query bodies (getLabelLookup, getUsers) get coverage.

const { expect } = require('../mocha_helpers');
const { useMongo } = require('../helpers/mongo');

const Severity = require('../../lib/severity').Model;

describe('[integration] Severity statics', function () {
  this.timeout(30_000);
  useMongo(this);

  // useMongo's beforeEach clears collections — each `it` seeds exactly the
  // rows it needs.

  const SYSTEM_ROWS = [
    { value: 1, label: 'Clear', system: true, background: '#0f0', foreground: '#000' },
    { value: 3, label: 'Warning', system: true, background: '#fa0', foreground: '#000' },
    { value: 5, label: 'Critical', system: true, background: '#f00', foreground: '#fff' },
  ];

  describe('getLabelLookup', function () {
    it('returns only system rows with value + label projected', function (done) {
      Severity.create(SYSTEM_ROWS as any)
        .then(() => {
          Severity.getLabelLookup(function (err: any, rows: any[]) {
            try {
              expect(err).to.be.null;
              expect(rows).to.have.lengthOf(3);
              for (const r of rows) {
                expect(r.value).to.be.a('number');
                expect(r.label).to.be.a('string');
                expect(r.background).to.be.undefined;
                expect(r.foreground).to.be.undefined;
              }
              const labels = rows.map(r => r.label).sort();
              expect(labels).to.eql(['Clear', 'Critical', 'Warning']);
              done();
            } catch (e) {
              done(e);
            }
          });
        })
        .catch(done);
    });
  });

  describe('getUsers', function () {
    it("merges system defaults with the user's overrides", function (done) {
      // Seed only alice's row so the (broken-by-design) owner-less query
      // returns the override we expect.
      Severity.create([
        ...SYSTEM_ROWS,
        { value: 3, label: 'Watch', system: false, background: '#fc0', foreground: '#000' },
      ] as any)
        .then(() => {
          Severity.getUsers('alice', function (err: any, sevs: any[]) {
            try {
              expect(err).to.be.null;
              const by_value: any = {};
              for (const s of sevs) by_value[s.value] = s.label;
              expect(by_value).to.eql({ 1: 'Clear', 3: 'Watch', 5: 'Critical' });
              done();
            } catch (e) {
              done(e);
            }
          });
        })
        .catch(done);
    });

    it('returns only system rows when no user overrides exist', function (done) {
      Severity.create(SYSTEM_ROWS as any)
        .then(() => {
          Severity.getUsers('charlie', function (err: any, sevs: any[]) {
            try {
              expect(err).to.be.null;
              const labels = sevs.map((s: any) => s.label).sort();
              expect(labels).to.eql(['Clear', 'Critical', 'Warning']);
              done();
            } catch (e) {
              done(e);
            }
          });
        })
        .catch(done);
    });

    // Documents a real bug in lib/severity.js: the schema has no `owner` path
    // (lines 18-24), so Mongoose 6's strictQuery default silently drops the
    // `owner: user` filter from the user-rows query. Every user sees every
    // other user's overrides. Worth raising as a ticket; not test-level.
    it("[bug] leaks every user's overrides into every other user's lookup", function (done) {
      Severity.create([
        ...SYSTEM_ROWS,
        { value: 5, label: 'BobsCrit', system: false, background: '#900', foreground: '#fff' },
      ] as any)
        .then(() => {
          Severity.getUsers('alice', function (err: any, sevs: any[]) {
            try {
              expect(err).to.be.null;
              const labels = sevs.map((s: any) => s.label);
              // alice should NOT see "BobsCrit" but currently does.
              expect(labels).to.include('BobsCrit');
              done();
            } catch (e) {
              done(e);
            }
          });
        })
        .catch(done);
    });
  });
});
