//
// Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

/*
 * find any old cleared alerts
 * AND have been acknowledged
 * AND have not occured within the last two minutes
 * then run then acknowledge them and set the owner to 'system'
 */
module.exports = {
  query: function () {
    var t = new Date();
    //var tm = t.setHours( t.getHours() - 2 );
    var tm = t.setMinutes(t.getMinutes() - 2);

    var o = { severity: 0 };
    o.last_occurrence = { $lt: tm };
    return o;
  },
  action: {
    update: { acknowledged: true, owner: 'system' },
  },
  when: { periodic: 33 },
  activated: false,
};
