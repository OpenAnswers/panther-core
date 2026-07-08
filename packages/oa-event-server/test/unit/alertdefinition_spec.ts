//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../mocha_helpers');

const mongoose = require('mongoose');

const AlertDefinition = require('../../lib/alertdefinition');

describe('alertdefinition module', function () {
  it('exports a mongoose Schema', function () {
    expect(AlertDefinition.Schema).to.be.an.instanceof(mongoose.Schema);
  });

  it('defines the expected String paths', function () {
    const paths = AlertDefinition.Schema.paths;
    for (const name of ['column', 'column_alias', 'priority', 'display_type', 'type', 'label', 'width']) {
      expect(paths[name], name).to.exist;
      expect(paths[name].instance, name).to.equal('String');
    }
  });

  it('exposes the lookup static methods', function () {
    expect(AlertDefinition.Schema.statics.getDefaultLayout).to.be.a('function');
    expect(AlertDefinition.Schema.statics.getMandatoryColumns).to.be.a('function');
    expect(AlertDefinition.Schema.statics.getAllowedColumns).to.be.a('function');
    expect(AlertDefinition.Schema.statics.toExtModelFields).to.be.a('function');
  });

  it('registers the "AlertDefinition" model', function () {
    expect(AlertDefinition.Model).to.equal(mongoose.model('AlertDefinition'));
    expect(AlertDefinition.Model.modelName).to.equal('AlertDefinition');
  });

  it('registers a pre-save hook', function () {
    // mongoose internals — just check the hook list has a save hook installed
    const hooks: any = (AlertDefinition.Schema as any).s?.hooks;
    const pre_save = hooks?._pres?.get?.('save') ?? hooks?.getPres?.('save');
    expect(pre_save, 'pre-save hook registered').to.be.an('array').with.lengthOf.at.least(1);
  });
});
