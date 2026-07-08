//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../mocha_helpers');

const mongoose = require('mongoose');

const Severity = require('../../lib/severity');

describe('severity module', function () {
  it('exports a mongoose Schema', function () {
    expect(Severity.Schema).to.be.an.instanceof(mongoose.Schema);
  });

  it('defines value, label, background, foreground, system paths', function () {
    const paths = Severity.Schema.paths;
    expect(paths.value.instance).to.equal('Number');
    expect(paths.label.instance).to.equal('String');
    expect(paths.background.instance).to.equal('String');
    expect(paths.foreground.instance).to.equal('String');
    expect(paths.system.instance).to.equal('Boolean');
  });

  it('defaults `system` to false', function () {
    expect(Severity.Schema.path('system').defaultValue).to.equal(false);
  });

  it('exposes the getLabelLookup and getUsers static methods', function () {
    expect(Severity.Schema.statics.getLabelLookup).to.be.a('function');
    expect(Severity.Schema.statics.getUsers).to.be.a('function');
  });

  it('registers the "severitys" model with mongoose', function () {
    expect(Severity.Model).to.equal(mongoose.model('severitys'));
    expect(Severity.Model.modelName).to.equal('severitys');
  });
});
