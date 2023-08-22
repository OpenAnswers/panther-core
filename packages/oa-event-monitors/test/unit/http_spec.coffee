#
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#

debug = require( 'debug' )( 'oa:test:unit:http' )
{ expect, supertest, sinon, nock } = require '../mocha_helpers'

# Disable logger for tests
process.env.NODE_ENV = 'test'

# Include the agent
agent = require '../../lib/http'

# Set our mock url
nock_server = 'http://localhost:41232'

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
  props: { apikeyserver: nock_server }
  eventCB: event_cb

# But only setup the express app for supertest to use
httpAgent.setup()
app = httpAgent.getApp()


# Setup the mock api-token service and responses
apitoken_mock = nock(nock_server)

  .get '/api/apikey/read/uuid-blag-uuid'
  .reply 200, {
    results: 1
    data: {
      _id: 'something'
      apikey: 'uuid-blag-uuid'
    }
  }

  .get '/api/apikey/read/uuid-bad-uuid'
  .reply 404, { message: 'Not found' }

  .get '/api/apikey/exists/uuid-blag-uuid'
  .reply 200, { found: true }

  .get '/api/apikey/exists/uuid-bad-uuid'
  .reply 200, { found: false }


describe 'http', ->

  beforeEach ->
    our_spy.reset()

  xit 'accepts a good api-token and event', ( done )->
    supertest(app)
    .post  '/api/event/create'
    .set   'X-Api-Token', 'uuid-blag-uuid'
    .set   'Accept', 'application/json'
    .send  event: { summary: 'test', node: 'what' }
    .end ( err, res ) ->
      expect( err ).to.equal null
      expect( res ).to.be.an 'object'
      expect( res.statusCode ).to.eql 200
      expect( our_spy.called ).to.be.truthey
      done()

  xit 'rejects a bad api-token', ( done )->
    supertest(app)
    .post  '/api/event/create'
    .set   'X-Api-Token', 'uuid-bad-uuid'
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
