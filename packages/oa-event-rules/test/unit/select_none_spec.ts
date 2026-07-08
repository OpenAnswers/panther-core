//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const debug = require('debug')('oa:test:unit:rules:select:none');

const { expect } = require('../mocha_helpers');

const { SelectNone } = require('../../lib/select_none');
const { Select } = require('../../lib/select');
const { Event } = require('../../lib/event');

describe('SelectNone', function () {
  it('builds an instance directly', function () {
    const ins = new SelectNone();
    expect(ins).to.be.an.instanceof(SelectNone);
  });

  it('is registered on Select.types under "none"', function () {
    expect(Select.types.none).to.equal(SelectNone);
  });

  it('has a label of "none"', function () {
    expect(new SelectNone().label).to.equal('none');
    expect(SelectNone.label).to.equal('none');
  });

  it('run() always returns false regardless of event data', function () {
    const ins = new SelectNone();
    expect(ins.run(Event.generate({ fieldname: 'whatever' }))).to.equal(false);
    expect(ins.run(Event.generate({}))).to.equal(false);
  });

  it('generate() returns an instance regardless of the yaml input', function () {
    const ins = SelectNone.generate({ none: true });
    expect(ins).to.be.an.instanceof(SelectNone);
  });

  it('to_yaml_obj() produces { none: true }', function () {
    const ins = new SelectNone();
    expect(ins.to_yaml_obj()).to.eql({ none: true });
  });

  it('to_yaml() dumps a yaml string', function () {
    const ins = new SelectNone();
    expect(ins.to_yaml()).to.equal('none: true\n');
  });
});
