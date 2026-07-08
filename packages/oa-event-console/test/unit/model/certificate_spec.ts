//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const { useMongo } = require('../../helpers/mongo');
const { Certificate } = require('../../../app/model/certificate');

describe('Unit::EventConsole::model::Certificate', function () {
  useMongo(this);

  const sample = (over: any = {}) => ({
    name: 'acme',
    file: '/tmp/acme.pem',
    cert: 'CERTDATA',
    key: 'KEYDATA',
    created_by: 'alice',
    ...over,
  });

  describe('statics.delete', function () {
    it('calls back with ValidationError for missing data', function (done) {
      Certificate.delete(undefined, (err: any) => {
        try {
          expect(err).to.not.equal(undefined);
          expect(err.name).to.equal('ValidationError');
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('calls back with ValidationError for missing id', function (done) {
      Certificate.delete({ name: 'acme' }, (err: any) => {
        try {
          expect(err.name).to.equal('ValidationError');
          expect(err.message).to.match(/id/);
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('calls back with ValidationError for missing name', function (done) {
      Certificate.delete({ id: '000000000000000000000000' }, (err: any) => {
        try {
          expect(err.name).to.equal('ValidationError');
          expect(err.message).to.match(/name/);
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });

  describe('statics.findName', function () {
    it('reports false when the name is not present', function (done) {
      Certificate.findName('missing', (err: any, found: boolean) => {
        try {
          expect(err).to.equal(null);
          expect(found).to.equal(false);
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('reports true when a cert with that name exists', async function () {
      await Certificate.create(sample());
      await new Promise<void>((resolve, reject) => {
        Certificate.findName('acme', (err: any, found: boolean) => {
          try {
            expect(err).to.equal(null);
            expect(found).to.equal(true);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });
  });

  describe('statics.getKey', function () {
    it('returns the key material for a known id', async function () {
      const doc = await Certificate.create(sample());
      await new Promise<void>((resolve, reject) => {
        Certificate.getKey(doc._id, (err: any, out: any) => {
          try {
            expect(err).to.equal(null);
            expect(out).to.deep.equal({ cert: 'KEYDATA', name: 'acme' });
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });

    it('calls back with a string error when the id is not found', async function () {
      await new Promise<void>((resolve, reject) => {
        Certificate.getKey('000000000000000000000000', (err: any) => {
          try {
            expect(err).to.match(/No key found/);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });
  });

  describe('statics.getCert', function () {
    it('returns cert and name for a known id', async function () {
      const doc = await Certificate.create(sample());
      await new Promise<void>((resolve, reject) => {
        Certificate.getCert(doc._id, (err: any, out: any) => {
          try {
            expect(err).to.equal(null);
            expect(out).to.deep.equal({ cert: 'CERTDATA', name: 'acme' });
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });
  });
});
