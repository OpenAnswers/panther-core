
module.exports = {
  type: "internal_update",
  name: 'clear_downs',
  /*
   * Trigger finds some results and each row is passed to function in criteria
   * we then return another query object and in the following case we are
   * looking for other alerts from the same node but that are older
   */
  criteria: function(lert){ return { severity: { '$gte': 1 }, node: lert.node, agent: lert.agent, type: 'down', last_occurrence: { '$lt': lert.last_occurrence } } },
  setit: function(lert){ return { severity: 0, acknowledged: true, owner: 'system' } }
  /*
   * or...
  criteria: null // trigger criteria used instead
   */
};

