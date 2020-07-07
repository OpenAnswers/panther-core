
module.exports = {
  type: "internal_update",
  name: 'clear_older_downs_for_this_node',
  criteria: function(lert){ 
    return { severity: { '$gte': 1 }, node: lert.node, agent: lert.agent, type: 'down', last_occurrence: { '$lt': lert.last_occurrence } }
  },
  setit: function(lert){ return { severity: 0, acknowledged: true, owner: 'system' } }
};

