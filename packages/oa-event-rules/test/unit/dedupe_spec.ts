//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const debug = require('debug')('oa:test:unit:rules:dedupe');

const { expect } = require('../mocha_helpers');

const { Dedupe } = require('../../lib/dedupe');
const { Rule } = require('../../lib/rule');
const { Event } = require('../../lib/event');

describe('Dedupe', function () {
  describe('gen_dedupe_rule', function () {
    it('builds a Rule from a 3-element [match, search, repl] tuple', function () {
      const rule = Dedupe.gen_dedupe_rule(['alpha', 'bravo', 'charlie']);
      expect(rule).to.be.an.instanceof(Rule);
      expect(rule.name).to.equal('dedupe alpha bravo charlie');
    });

    it('builds a Rule from a 2-element [match, repl] tuple (search defaults to match)', function () {
      const rule = Dedupe.gen_dedupe_rule(['delta', 'echo']);
      expect(rule).to.be.an.instanceof(Rule);
      expect(rule.name).to.equal('dedupe delta delta echo');
    });

    it('throws when the tuple has the wrong length', function () {
      expect(() => Dedupe.gen_dedupe_rule([])).to.throw(/nope/);
      expect(() => Dedupe.gen_dedupe_rule(['only-one'])).to.throw(/nope/);
      expect(() => Dedupe.gen_dedupe_rule(['a', 'b', 'c', 'd'])).to.throw(/nope/);
    });

    it('produces a rule that rewrites the summary field when run', function () {
      const rule = Dedupe.gen_dedupe_rule(['noisy', 'noisy', 'quiet']);
      const ev = Event.generate({ summary: 'noisy message' });
      rule.run(ev);
      expect(ev.get('summary')).to.equal('quiet message');
    });

    it('does not alter events that do not match', function () {
      const rule = Dedupe.gen_dedupe_rule(['noisy', 'noisy', 'quiet']);
      const ev = Event.generate({ summary: 'different message' });
      rule.run(ev);
      expect(ev.get('summary')).to.equal('different message');
    });
  });

  describe('generate', function () {
    it('returns an array of Rule instances, one per definition', function () {
      const rules = Dedupe.generate([
        ['alpha', 'bravo', 'charlie'],
        ['delta', 'echo'],
      ]);
      expect(rules).to.be.an('array').with.lengthOf(2);
      expect(rules[0]).to.be.an.instanceof(Rule);
      expect(rules[1]).to.be.an.instanceof(Rule);
      expect(rules[0].name).to.equal('dedupe alpha bravo charlie');
      expect(rules[1].name).to.equal('dedupe delta delta echo');
    });

    it('returns an empty array for an empty definition list', function () {
      expect(Dedupe.generate([])).to.eql([]);
    });

    it('propagates errors from malformed entries', function () {
      expect(() => Dedupe.generate([['only-one']])).to.throw(/nope/);
    });
  });
});
