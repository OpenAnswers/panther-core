#
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#


mocha   = require 'mocha'
expect  = require( 'chai' ).expect
sinon   = require 'sinon'
_       = require 'lodash'
supertest = require 'supertest'
nock    = require 'nock'

debug = require( 'debug' )( 'oa:mocha:helpers' )


event_samples =

  simple:
    identifier: 'qweiru42:3:simple alert summary of sev 3'
    node:       'qweiru42'
    severity:   3
    summary:    'simple alert summary of sev 3'

  middle:
    identifier: 'azeiru34:4:middle summary sev 4'
    node:       'azeiru34'
    severity:   4
    summary:    'middle summary sev 4'
    agent:      'sample'

  complex:
    identifier: 'rbeiru93:5:complex summary sev 5'
    node:       'rbeiru93'
    severity:   5
    summary:    'complex summary sev 5'
    agent:      'syslog'


# I guess this is esentially a mock for a RuleSet
rules_runner = ( ev, rules ) ->
  ev_processed = ev
  for rule in rules
    ev_processed = rule.run ev_processed
  ev_processed



module.exports =
  mocha:    mocha
  expect:   expect
  sinon:    sinon
  debug:    debug
  supertest: supertest
  event_samples:  event_samples
  rules_runner:   rules_runner
  nock: nock
  _:        _
