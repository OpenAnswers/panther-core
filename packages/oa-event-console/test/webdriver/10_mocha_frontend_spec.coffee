debug    = require( 'debug' )( 'oa:test:func:api' )
{ expect, Web } = require '../mocha_helpers'
{ WebDriver } = require '../mocha_helpers_webdriver'

client = null

# Test setup (from ENV)
web = Web.from_env_or_default()


describe_skip_prod = if process.env.NODE_ENV is "production"
  describe.skip
else
  describe

describe_skip_prod 'Frontend Tests', ->

  # Boot the app
  before (done) ->
    @timeout 20000
    app = Web.boot_complete_app(done)

  # Setup the client before anything else
  before ( done )->
    @timeout 20000
    WebDriver.fetch_client ( err, res )->
      client = res
      done(err)

  it 'changes to the Mocha All Test page', ( done )->
    @timeout 10000
    client.url web.url + '/test/all_view', done

  it 'checks for 331 test passes', ( done )->
    @timeout 10000
    client.waitForExist '#mocha-is-finished', 10000
    .getText '.passes > em'
    .then ( passes )->
      expect( parseInt(passes) ).to.gte 332
      done()

  it 'checks for 0 failures', ( done )->
    client.getText '.failures > em'
    .then ( failures )->
      expect( failures ).to.equal "0"
      done()


# Clean up cookies for the next test/run
after (done) ->
  return done() unless client 
  client.end done
