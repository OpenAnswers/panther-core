
module.exports = {
  type: "internal_update",
  name: 'sample_internal',
  /*
   * Trigger finds some results and each row is passed to function in criteria
   * we then return another query object and in the following case we are
   * looking for other alerts from the same node but that are older
   */
  criteria: function(lert){ return { node: lert.node, last_occurrence: { '$lt': lert.last_occurrence } } },
  setit: function(lert){ return { severity: lert.severity +1 } }
  /*
   * or...
  criteria: null // trigger criteria used instead
   */
};

