//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// logging
const debug = require('debug')('oa:test:unit:rules:action');

// helpers
const { expect } = require('../mocha_helpers');

// Test setup
const { Event } = require('../../lib/event');

describe('Event', function () {
  it('can instantiate an object', function () {
    const ev = new Event();
    expect(ev).to.be.an.instanceof(Event);
  });

  describe('Instance', function () {
    let ev = new Event();

    it('can set a value', function () {
      ev.set('summary', 'value');
      expect(ev.copy.summary).to.equal('value');
    });

    it('can get a value', function () {
      const summary = ev.get('summary');
      expect(summary).to.equal('value');
    });

    it('checks a field exists', function () {
      const summmary_existence = ev.exists('summary');
      expect(summmary_existence).to.equal(true);
    });

    it('sets the event to discard', function () {
      const discard = ev.discard();
      expect(ev.discard_id).to.equal(true);
    });

    it('generates a string representation', function () {
      expect(`${ev}`).to.equal('value');
    });

    it('add a match object', function () {
      const match_res = ev.match('test'.match(/test/));
      expect(ev._match).to.eql(match_res);
    });

    it('retrieve a match object', function () {
      expect(ev.match()).to.eql('test'.match(/test/));
    });

    it('can set an input value', function () {
      ev.set_input('summary', 'value');
      expect(ev.input.summary).to.eql('value');
    });

    it('can get an input value', function () {
      const summary = ev.get_input('summary');
      expect(summary).to.equal('value');
    });

    describe('identifier', function () {
      describe('from constructor', function () {
        beforeEach(function () {
          ev = new Event();
          ev.set('summary', 'value');
        });

        it('should fall back to the default identifier', function () {
          ev.populate_identifier();
          expect(ev.get('identifier')).to.equal('17232047023865718785');
        });

        it('should user input when available', function () {
          ev.set_input('identifier', 'w-{summary}-w');
          ev.populate_identifier();
          expect(ev.get('identifier')).to.equal('16886348280168576260');
        });

        it('should always use the set value in copy', function () {
          ev.set('identifier', 'wakkawakka-{summary}');
          ev.populate_identifier();
          expect(ev.get('identifier')).to.equal('9508471824931390859');
        });
      });

      describe('from .generate', function () {
        beforeEach(function () {
          ev = Event.generate({ summary: 'value' });
        });

        it('should fall back to the default', function () {
          ev.populate_identifier();
          expect(ev.get('identifier')).to.equal('17232047023865718785');
        });

        it('should user input when available', function () {
          ev.set_input('identifier', 'w-{summary}-w');
          ev.populate_identifier();
          expect(ev.get('identifier')).to.equal('16886348280168576260');
        });

        it('should always use the set value in copy', function () {
          ev.set('identifier', 'wakkawakka-{summary}');
          ev.populate_identifier();
          expect(ev.get('identifier')).to.equal('9508471824931390859');
        });
      });
    });
  });

  describe('generate', function () {
    it('can generate an object', function () {
      const ev = Event.generate({
        summary: 'test',
      });
      expect(ev).to.be.an.instanceof(Event);
    });
  });
});
