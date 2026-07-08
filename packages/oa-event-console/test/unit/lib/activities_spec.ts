//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');

const { Activities } = require('../../../lib/activities');
const { Activity }   = require('../../../app/model/activity');

describe('Unit::EventConsole::lib::activities', function() {

  afterEach(function() { sinon.restore(); });

  describe('type_to_history_text', function() {
    it('returns the static message for acknowledge', function() {
      expect(Activities.type_to_history_text('acknowledge', {})).to.equal('Acknowleged');
    });

    it('interpolates set_fields via util.format for assign', function() {
      expect(Activities.type_to_history_text('assign', { owner: 'alice' }))
        .to.equal('Assigned to alice');
    });

    it('interpolates severity from set_fields', function() {
      expect(Activities.type_to_history_text('severity', { severity: 4 }))
        .to.equal('Changed severity to 4');
    });
  });

  describe('store_Async', function() {
    it('saves an Activity with a formatted message and resolves with the result', async function() {
      let captured: any;
      sinon.stub(Activity.prototype, 'save').callsFake(function(this: any) {
        captured = this;
        return Promise.resolve(this);
      });

      const result = await Activities.store_Async('event', 'assign', 'alice', {
        ids: ['x'], owner: 'bob'
      });

      expect(result).to.equal(captured);
      expect(captured.username).to.equal('alice');
      expect(captured.category).to.equal('event');
      expect(captured.type).to.equal('assign');
      expect(captured.message.text).to.match(/alice assigned .* to bob/);
    });

    it('throws when the category is unknown', async function() {
      let threw: any;
      try { await Activities.store_Async('not-a-category', 'x', 'u', {}); }
      catch (e) { threw = e; }
      expect(threw).to.exist;
    });

    it('throws when the type is unknown within a valid category', async function() {
      let threw: any;
      try { await Activities.store_Async('event', 'not-a-type', 'u', {}); }
      catch (e) { threw = e; }
      expect(threw).to.exist;
    });
  });

  describe('store / store_event', function() {
    it('store_event delegates to store under the "event" category', async function() {
      const storeStub = sinon.stub(Activities, 'store').resolves();
      await Activities.store_event('delete', 'alice', { ids: ['a'] });
      expect(storeStub.calledWith('event', 'delete', 'alice', { ids: ['a'] })).to.be.true;
    });

    it('store swallows save errors (logs but does not reject)', async function() {
      sinon.stub(Activity.prototype, 'save').rejects(new Error('db down'));
      // If this rejects, the assertion fails.
      await Activities.store('event', 'acknowledge', 'alice', {});
    });
  });
});
