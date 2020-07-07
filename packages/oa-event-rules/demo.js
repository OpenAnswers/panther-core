var ruleEngine =  require('./lib');
var lodash = require('lodash');

var rules = new ruleEngine.EventRules({server:true, path: './sample.rules.yml'})

var lert = {
  identifier: 'State:http:zoostorm:Alive',
  alert_group: 'PantherState',
  agent: 'http',
  node: 'zoostorm',
  severity: 1,
  last_occurrence: '2017-10-26T15:30:42.252Z',
  type: 'up',
  summary: 'demo 33'
}

let t = rules.run( lert, {tracking_matches: true});

console.log( t );


let m = {
  globals: [
    { name: 'default identifier eg', uuid: 'xxxx-yyyy'},
    { name: 'default identifier eg', uuid: 'xxxx-yyyy'},
    { name: 'default identifier eg', uuid: 'xxxx-yyyy'},
  ],
  groups: [
    { group_name: 'mygroup', group_uuid: 'aaaa-bbbb', matches: [
      { name: 'myrules', uuid: 'dddd-xxxx'}
    ]}
  ]
}

let m1 = lodash.map(m.groups, "group_uuid")

let m3 = lodash.chain( m.groups)
        .flatMap("matches")
let m2 = lodash.flatMap(m.groups, "matches").map("uuid")

console.log('done');