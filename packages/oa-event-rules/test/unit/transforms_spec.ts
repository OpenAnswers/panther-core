//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const debug = require('debug')('oa:test:unit:rules:option');

const { expect } = require('../mocha_helpers');

const { Transforms } = require('../../lib/transforms');

// So we can test events

describe('Transforms', function () {
  describe('available', function () {
    expect(Transforms).to.have.property('available_transforms');
  });

  describe('can', function () {
    let tat: any = null;

    before(function () {
      expect(Transforms).to.have.property('available_transforms');
      tat = Transforms.available_transforms;
    });

    it('should do the transforms', function () {
      expect(tat).to.have.property('to_lower_case');
      expect(tat.to_lower_case.function('TEST')).to.equal('test');

      expect(tat).to.have.property('to_upper_case');
      expect(tat.to_upper_case.function('test')).to.equal('TEST');

      expect(tat).to.have.property('left_trim');
      expect(tat.left_trim.function(' test ')).to.equal('test ');

      expect(tat).to.have.property('right_trim');
      expect(tat.right_trim.function(' test ')).to.equal(' test');
      expect(tat.right_trim.function(' test\n')).to.equal(' test');
      expect(tat.right_trim.function(' test\n ')).to.equal(' test');

      expect(tat).to.have.property('trim');
      expect(tat.trim.function(' test ')).to.equal('test');
      expect(tat.trim.function(' test\n')).to.equal('test');
      expect(tat.trim.function(' test\n ')).to.equal('test');
      expect(tat.trim.function('\ttest')).to.equal('test');
    });
  });
});
