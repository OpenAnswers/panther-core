//
// Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

module.exports = {
  query: { severity: { $gte: 5 }, owner: { $ne: 'vince' } },

  action: {
    columns: '*',
    execute: 'sample_external',
  },

  when: { periodic: 17 },
  activated: false,
};
