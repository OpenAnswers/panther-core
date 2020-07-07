debug    = require( 'debug' )( 'oa:test:func:api:events' )

{ expect, supertest } = require '../mocha_helpers'
{ random_string }     = require 'oa-helpers'

# Test setup
app       = null
path      = "/api/event/"
app_up    = require '../mocha_app'


before (done)->
  @timeout 20000
  app_up ( err, result )->
    return done(err) if err
    app = result
    done()


xdescribe 'Event API', ->

  id = null

  xit 'creates an object for an /event', ( done ) ->
    str = random_string(8)

    event =
      node:       "node"
      severity:   3
      summary:    "test #{str}"
    
    supertest(app).post "#{path}/create"
    .send event
    .end ( err, res )->
      expect( err ).to.equal null
      expect( res.statusCode ).to.eql 200
      expect( res.body ).to.be.a 'object'
      expect( res.body ).to.contain.all.keys ['event','message']
      expect( res.body.message ).to.match /^Saved new alert: /
      expect( res.body.event.id ).to.be.a 'string'
      id = res.body.event.id
      done()

  it 'recieves the created object for an /events/read', ( done )->
    supertest(app).get "#{path}s/read"
    .end ( err, res ) ->
      expect( err ).to.equal null
      expect( res.statusCode ).to.eql 200
      expect( res.body ).to.be.an 'object'
      expect( res.body ).to.contain.keys [ 'results', 'events' ]
      expect( res.body.events ).to.be.an 'array'
      expect( res.body.results ).to.be.gt 0
      done()

  it 'recieves the created object for an /event/read/:id', ( done )->
    supertest(app).get "#{path}/read/#{id}"
    .end ( err, res ) ->
      expect( err ).to.equal null
      expect( res.statusCode ).to.eql 200
      expect( res.body ).to.be.an 'object'
      expect( res.body.event ).to.be.an 'object'
      expect( res.body.event ).to.contain.all.keys [
        'id','node','severity','summary','identifier'
      ]
      done()

  it 'deletes the created object /event/delete/:id', ( done )->
    supertest(app).delete "#{path}/delete/#{id}"
    .end ( err, res ) ->
      expect( err ).to.equal null
      expect( res.statusCode ).to.eql 200
      expect( res.body ).to.be.an 'object'
      expect( res.body.result ).to.be.an 'object'
      expect( res.body.result ).to.contain.all.keys ['ok','n']
      expect( res.body.result.ok ).to.eql 1
      expect( res.body.result.n ).to.eql 1
      done()


xdescribe 'errors', ->

  it '400 a bad event id /event', ( done )->
    supertest(app).get "#{path}/read/4-13543543151"
    .end ( err, res ) ->
      expect( res.statusCode ).to.eql 400
      expect( res.type ).to.eql 'application/json'
      expect( res.body ).to.be.an 'object'
      expect( res.body ).to.contain.all.keys ['message']
      expect( res.body.message ).to.match /Invalid event id/
      done()

  it '404 a missing event id /event', ( done )->
    supertest(app).get "#{path}/read/462b75e75c53ecb0164b66d3"
    .end ( err, res ) ->
      expect( res.statusCode ).to.eql 404
      expect( res.type ).to.eql 'application/json'
      expect( res.body ).to.be.an 'object'
      expect( res.body ).to.contain.all.keys ['message']
      expect( res.body.message ).to.match /Not Found/
      done()
