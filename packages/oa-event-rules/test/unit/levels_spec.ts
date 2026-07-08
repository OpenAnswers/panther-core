//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../mocha_helpers');

const Levels = require('../../lib/levels');

describe('Levels', function () {
  describe('generate', function () {
    it('returns the syslog_severity_map from the yaml definition', function () {
      const map = { 0: 'emergency', 1: 'alert', 7: 'debug' };
      expect(Levels.generate({ syslog_severity_map: map })).to.equal(map);
    });

    it('returns undefined when the key is missing', function () {
      expect(Levels.generate({})).to.equal(undefined);
    });

    it('does not mutate the provided map', function () {
      const map = { 0: 'emergency' };
      const snapshot = { ...map };
      Levels.generate({ syslog_severity_map: map });
      expect(map).to.eql(snapshot);
    });

    it('throws when the yaml definition is null/undefined', function () {
      expect(() => Levels.generate(undefined)).to.throw(TypeError);
      expect(() => Levels.generate(null)).to.throw(TypeError);
    });
  });
});
