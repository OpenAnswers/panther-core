
/*
 * Small example of a simple trigger with an action
 * finds all events with a tally 5 or above and severity below 3
 * updates the severity to 3
 */
module.exports = {
  query: { tally: { $gte: 5 }, severity: {$lt : 3} },

  action: {
    update: { severity: 3}
  },

  when: { periodic: 17 },
  activated: false
};
