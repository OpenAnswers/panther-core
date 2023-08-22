//
// Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

/*
 * find any cleared alerts
 * AND have an owner
 * AND have been acknowledged
 * then run the default delete action against them to purge them from the database
 */

module.exports = {
  query: { type: 'up' },

  action: {
    execute: 'clear_older_downs_for_this_node',
    //columns: [ '_id', 'node', 'location', 'severity', 'last_occurrence', 'agent', 'upsert_timestamps' ]
  },
  /*
   * action: {
   *  update: { severity: 2 }
   *  update: function() { return { severity: 3 }; }
   * action: {
   *  each: true,
   *  execute: [ 'clear_downs' ],
   *  columns: [ '_id', 'node', 'location', 'severity', 'last_occurrence', 'agent', 'upsert_timestamps' ]
   * }
   */

  on_success: {
    pre_wait: 5,
    raise: 'trigger completed ok',
  },

  on_failure: {
    raise: 'trigger failed',
  },

  when: { periodic: 25 },
  /*
   * when: { on: 'named event' },
   * when: { at: '17:45' },
   */

  activated: false,
};
