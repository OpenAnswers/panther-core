//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const { useMongo } = require('../../helpers/mongo');
const mongoose = require('mongoose');
const { Filters } = require('../../../app/model/filters');

describe('Unit::EventConsole::model::Filters', function () {
  useMongo(this);

  it('pre-save populates created_at and modified_at', async function () {
    const doc = await Filters.create({ user: 'alice', name: 'Mine', f: { owner: 'alice' } });
    expect(doc.created_at).to.be.instanceof(Date);
    expect(doc.modified_at).to.be.instanceof(Date);
  });

  it('rejects saves without a name', async function () {
    let err: any = null;
    try {
      await Filters.create({ user: 'alice' });
    } catch (e) {
      err = e;
    }
    expect(err).to.not.equal(null);
    expect(err.errors).to.have.property('name');
  });

  describe('update_data', function () {
    it('rejects missing _id', async function () {
      let err: any = null;
      try {
        await Filters.update_data({ name: 'x' });
      } catch (e) {
        err = e;
      }
      expect(err).to.not.equal(null);
      expect(err.name).to.equal('ValidationError');
      expect(err.message).to.match(/_id/);
    });

    it('rejects missing name', async function () {
      let err: any = null;
      try {
        await Filters.update_data({ _id: new mongoose.Types.ObjectId() });
      } catch (e) {
        err = e;
      }
      expect(err).to.not.equal(null);
      expect(err.name).to.equal('ValidationError');
      expect(err.message).to.match(/name/);
    });

    it('coerces name to a string', async function () {
      const doc = await Filters.create({ user: 'alice', name: 'one' });
      await Filters.update_data({ _id: doc._id, name: 42 });
      const refreshed = await Filters.findById(doc._id);
      expect(refreshed.name).to.equal('42');
    });
  });

  describe('set_default', function () {
    it('rejects missing id', async function () {
      let err: any = null;
      try {
        await Filters.set_default('alice', undefined);
      } catch (e) {
        err = e;
      }
      expect(err).to.not.equal(null);
      expect(err.name).to.equal('ValidationError');
    });

    it('rejects missing user', async function () {
      let err: any = null;
      try {
        await Filters.set_default(undefined, new mongoose.Types.ObjectId());
      } catch (e) {
        err = e;
      }
      expect(err).to.not.equal(null);
      expect(err.name).to.equal('ValidationError');
    });
  });

  describe('delete_user', function () {
    it('rejects missing user', async function () {
      let err: any = null;
      try {
        await Filters.delete_user(undefined);
      } catch (e) {
        err = e;
      }
      expect(err).to.not.equal(null);
      expect(err.name).to.equal('ValidationError');
    });

    it('removes a filter belonging to the user', async function () {
      await Filters.create({ user: 'alice', name: 'Mine' });
      const res = await Filters.delete_user('alice');
      expect(res.deletedCount).to.equal(1);
    });
  });
});
