//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');

const { Mongoose }  = require('../../../lib/mongoose');
const { Severity }  = require('../../../app/model/severity');
const { promisedFilterSummary } = require('../../../lib/queries');

describe('Unit::EventConsole::lib::queries', function() {

  afterEach(function() { sinon.restore(); });

  it('returns aggregated severity counts, group counts, and severity list', async function() {
    const sevCounts      = [{ _id: 3, total: 10 }];
    const sevCountsGroup = [{ _id: { group: 'web', severity: 3 }, total: 4 }];
    const severities     = [{ _id: 'x', value: 3, label: 'critical' }];

    const toArrayChain = (data: any) => ({
      sort: () => ({ toArray: () => Promise.resolve(data) })
    });
    sinon.stub(Mongoose, 'alerts').value({
      aggregate: sinon.stub()
        .onFirstCall().returns(toArrayChain(sevCounts))
        .onSecondCall().returns(toArrayChain(sevCountsGroup))
    });
    sinon.stub(Severity, 'getSeveritiesWithId').resolves(severities);

    const result: any = await promisedFilterSummary();
    expect(result.sev_counts).to.deep.equal(sevCounts);
    expect(result.sev_counts_group).to.deep.equal(sevCountsGroup);
    expect(result.severities).to.deep.equal(severities);
  });
});
