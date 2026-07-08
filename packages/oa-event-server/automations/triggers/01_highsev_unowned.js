//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

module.exports = {
  query: { severity: { $gte: 5 }, owner: { $ne: 'admin' } },

  action: {
    columns: '*',
    execute: 'sample_external',
  },

  when: { periodic: 17 },
  activated: true,
};
