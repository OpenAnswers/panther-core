//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const { useMongo } = require('../../helpers/mongo');
const mongoose = require('mongoose');
const { User, RESET_TOKEN_LENGTH } = require('../../../app/model/user');

describe('Unit::EventConsole::model::User', function () {
  useMongo(this);

  const make = async (over: any = {}) => {
    const doc = new User({
      username: 'alice',
      email: 'Alice@Example.Com',
      group: 'user',
      ...over,
    });
    await doc.save();
    return doc;
  };

  it('pre-save lowercases email and refreshes updated', async function () {
    const doc = await make();
    expect(doc.email).to.equal('alice@example.com');
    expect(doc.updated).to.be.instanceof(Date);
  });

  it('reset.token is a default random string of RESET_TOKEN_LENGTH chars', async function () {
    const doc = await make();
    expect(doc.reset.token).to.be.a('string');
    expect(doc.reset.token).to.have.lengthOf(RESET_TOKEN_LENGTH);
  });

  describe('isAdministrator', function () {
    it('returns true for admin group', async function () {
      const doc = await make({ username: 'root', email: 'r@x', group: 'admin' });
      expect(doc.isAdministrator()).to.equal(true);
    });

    it('returns false for user group', async function () {
      const doc = await make();
      expect(doc.isAdministrator()).to.equal(false);
    });
  });

  describe('generate_token', function () {
    it('rotates token and sets expires ~20 minutes ahead by default', async function () {
      const doc = await make();
      const previous = doc.reset.token;
      const before = Date.now();
      doc.generate_token();
      expect(doc.reset.token).to.be.a('string').and.have.lengthOf(64);
      expect(doc.reset.token).to.not.equal(previous);
      const delta = doc.reset.expires.getTime() - before;
      expect(delta).to.be.within(19 * 60 * 1000, 21 * 60 * 1000);
    });

    it('honours a custom minutes argument', async function () {
      const doc = await make();
      const before = Date.now();
      doc.generate_token(5);
      const delta = doc.reset.expires.getTime() - before;
      expect(delta).to.be.within(4 * 60 * 1000, 6 * 60 * 1000);
    });
  });

  describe('statics.read_one', function () {
    it('rejects when no user is supplied', async function () {
      let err: any = null;
      try {
        await User.read_one(null);
      } catch (e) {
        err = e;
      }
      expect(err).to.not.equal(null);
      expect(err.name).to.equal('ValidationError');
    });

    it('returns the matching document', async function () {
      await make();
      const found = await User.read_one('alice');
      expect(found.username).to.equal('alice');
    });
  });

  describe('statics.read_all', function () {
    it('returns username, group, email, created fields sorted by username', async function () {
      await make({ username: 'zed', email: 'z@x' });
      await make({ username: 'alice', email: 'a@x' });
      const rows = await User.read_all();
      expect(rows.map((r: any) => r.username)).to.deep.equal(['alice', 'zed']);
      const obj = rows[0].toObject();
      expect(obj).to.include.all.keys('username', 'group', 'email', 'created');
    });
  });

  describe('statics.update_data', function () {
    it('rejects with ValidationError when _id is missing', async function () {
      let err: any = null;
      try {
        await User.update_data({ username: 'alice' });
      } catch (e) {
        err = e;
      }
      expect(err).to.not.equal(null);
      expect(err.name).to.equal('ValidationError');
    });

    it('rejects with ValidationError when username is missing', async function () {
      let err: any = null;
      try {
        await User.update_data({ _id: new mongoose.Types.ObjectId() });
      } catch (e) {
        err = e;
      }
      expect(err).to.not.equal(null);
      expect(err.name).to.equal('ValidationError');
    });

    it('rejects when username is not a string', async function () {
      let err: any = null;
      try {
        await User.update_data({ _id: new mongoose.Types.ObjectId(), username: 42 });
      } catch (e) {
        err = e;
      }
      expect(err).to.not.equal(null);
    });

    it('applies the update for a valid payload', async function () {
      const doc = await make();
      await User.update_data({ _id: doc._id, username: 'alice', email: 'new@x' });
      const refreshed = await User.findById(doc._id);
      expect(refreshed.email).to.equal('new@x');
    });
  });

  describe('statics.delete_user', function () {
    it('throws ValidationError when the user is missing', function () {
      expect(() => User.delete_user(null)).to.throw(/No user for delete/);
    });

    it('removes the named user', async function () {
      await make();
      const res = await User.delete_user('alice');
      expect(res.deletedCount).to.equal(1);
    });
  });

  describe('statics.tokenExpired', function () {
    it('returns "token doesn\'t exist" message when no user matches', function (done) {
      User.tokenExpired('nope', (msg: string) => {
        try {
          expect(msg).to.match(/token doesn't exist/);
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });
});
