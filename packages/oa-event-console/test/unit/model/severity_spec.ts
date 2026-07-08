//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const { useMongo } = require('../../helpers/mongo');
const { Severity } = require('../../../app/model/severity');

describe('Unit::EventConsole::model::Severity', function () {
  useMongo(this);

  beforeEach(async function () {
    await Severity.create([
      { value: 5, label: 'critical', background: '#f00', foreground: '#fff', system: true },
      { value: 3, label: 'warning', background: '#fa0', foreground: '#000', system: true },
      { value: 1, label: 'info', background: '#0f0', foreground: '#000', system: true },
      { value: 9, label: 'non-system', system: false },
    ]);
  });

  describe('getLabels', function () {
    it('returns system severities sorted value desc with only value/label fields', async function () {
      const rows = await Severity.getLabels();
      expect(rows.map((r: any) => r.value)).to.deep.equal([5, 3, 1]);
      const first = rows[0].toObject();
      expect(first).to.have.keys(['_id', 'value', 'label']);
    });

    it('excludes non-system severities', async function () {
      const rows = await Severity.getLabels();
      expect(rows.find((r: any) => r.label === 'non-system')).to.equal(undefined);
    });
  });

  describe('getSeveritiesWithId', function () {
    it('returns _id, value, label, background sorted by value desc', async function () {
      const rows = await Severity.getSeveritiesWithId();
      expect(rows.map((r: any) => r.value)).to.deep.equal([5, 3, 1]);
      const first = rows[0].toObject();
      expect(first).to.have.keys(['_id', 'value', 'label', 'background']);
      expect(first).to.not.have.property('foreground');
    });
  });
});
