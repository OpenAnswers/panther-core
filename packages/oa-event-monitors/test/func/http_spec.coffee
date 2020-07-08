#
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#

# Needs environment variables set to talk to an instance.

#     PANTHER_API_SERVICE=http://localhost:3001
#     PANTHER_API_TOKEN=Hi40aZ3lSDF9139laecPmnqpf3hbb
#     PANTHER_TEST_TOKEN=vbqZGhZMFhQxqzaxiPzimPVs68tmuhOL

debug = require( 'debug' )( 'oa:test:unit:http' )
{ expect, supertest, sinon, nock } = require '../mocha_helpers'

# Disable logger for tests
process.env.NODE_ENV = 'test'

# Include the agent
agent = require '../../lib/http'

# Set our url, this a real system for the functional tests
token_server = process.env.PANTHER_API_SERVICE or 'http://localhost:3001'
token_key = process.env.PANTHER_API_TOKEN or ''
token_key = process.env.PANTHER_TEST_TOKEN or ''
# Create a spy to watch the event callbacks
our_spy = sinon.spy()

# Create a function to emulate the event callbacks,
# and call our spy
event_cb = (obj,cb,qcb,lcb)->
  debug('event cb was called with',obj,!!cb,!!qcb,!!lcb)
  our_spy()
  cb null, {message: 'created', event: obj} if cb
  qcb(null, {message: 'queued'}) if qcb
  lcb(null, {message: 'queued'}) if lcb

# Now create out http agent instance
httpAgent = new agent.Agent
  props: { apikeyserver: token_server }
  eventCB: event_cb

# But only setup the express app for supertest to use
httpAgent.setup()
app = httpAgent.getApp()



describe 'http', ->

  beforeEach ->
    our_spy.reset()

  it 'accepts a good api-token and event', ( done )->
    supertest(app)
    .post  '/api/event/create'
    .set   'X-Api-Token', token_key
    .set   'Accept', 'application/json'
    .send  event: { summary: 'test', node: 'what' }
    .end ( err, res ) ->
      expect( err ).to.equal null
      expect( res ).to.be.an 'object'
      expect( res.statusCode ).to.eql 200
      expect( our_spy.called ).to.be.truthey
      done()

  it 'rejects a bad api-token', ( done )->
    supertest(app)
    .post  '/api/event/create'
    .set   'X-Api-Token', 'what'
    .set   'Accept', 'application/json'
    .send  event: { summary: 'test', node: 'what' }
    .end ( err, res ) ->
      expect( err ).to.equal null
      expect( res ).to.be.an 'object'
      expect( res.statusCode ).to.eql 401
      expect( our_spy.called ).to.be.falsey
      done()

  describe 'api', ->

    it 'boots', ->
      expect( true ).to.be.falsey
