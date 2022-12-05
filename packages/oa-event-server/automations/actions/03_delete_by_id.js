//
// Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

module.exports = {
  type: 'internal_delete',
  name: 'delete_by_id',
  criteria: function (lert) {
    return { _id: lert._id };
  },
};
