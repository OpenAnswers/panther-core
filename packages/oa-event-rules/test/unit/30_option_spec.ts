//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const debug = require('debug')('oa:test:unit:rules:option');

const { expect } = require('../mocha_helpers');

const { Option, OptionBase, OptionUnless, OptionSkip, OptionDebug, OptionOriginal } = require('../../lib/option');

// So we can test events
const { Event } = require('../../lib/event');

describe('OptionSkip', function () {
  it('should create an instance', function () {
    expect(new OptionSkip()).to.be.an.instanceof(OptionSkip);
  });

  it('should generate an instance', function () {
    expect(OptionSkip.generate({ skip: true })).to.be.an.instanceof(OptionSkip);
  });

  it('should return an object', function () {
    expect(new OptionSkip().to_object()).to.eql({ skip: true });
  });
});

describe('OptionDebug', function () {
  it('should have the types property', function () {
    expect(new OptionDebug()).to.be.an.instanceof(OptionDebug);
  });

  it('should have the types property', function () {
    expect(OptionDebug.generate({ debug: true })).to.be.an.instanceof(OptionDebug);
  });

  it('should return an object', function () {
    expect(new OptionDebug().to_object()).to.eql({ debug: true });
  });
});

describe('Option', function () {
  it('should have the types property', function () {
    expect(Option.types).to.be.an.instanceof(Object);
  });

  it('class has types_description', function () {
    expect(Option.types_description).to.be.an.instanceof(Object);
  });

  it('should return a list of the available option types', function () {
    const options = Option.types_list();
    expect(options).to.be.an.instanceof(Array);
    expect(options).to.contain('debug', 'skip');
  });

  it('should return the same option types twice', function () {
    const first = Option.types_list();
    const second = Option.types_list();
    expect(first).to.eql(second);
  });

  it('should generate an Option instance', function () {
    const option = Option.generate({ skip: true });
    expect(option).to.be.an.instanceof(Option);
  });

  it('should produce a debug object', function () {
    const option = Option.generate({ debug: true });
    expect(option.to_object()).to.eql({ debug: true });
  });
});
