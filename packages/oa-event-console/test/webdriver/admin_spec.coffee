debug    = require( 'debug' )( 'oa:test:func:api' )

path     = require 'path'
util     = require 'util'


{ _, expect, Web } = require '../mocha_helpers'
{ WebDriver } = require '../mocha_helpers_webdriver'

client = null

# Test setup (from ENV)
web = Web.from_env_or_default()



# Boot the app
before ( done )->
  @timeout 20000
  app = Web.boot_complete_app(done)

# Setup the client before anything else
before ( done )->
  @timeout 20000
  WebDriver.fetch_authenticated_client web, ( err, res )->
    client = res
    done(err)


describe 'Admin', ->

  it 'changes to the Admin page', ( done )->
    @timeout 5000
    client
      .url web.url + '/admin', done


  describe 'Console Users', ->

    ruid = _.random(10,99)
    data_user = "data-user=\"test_webd#{ruid}\""

    it 'checks for the presence Console Users card', ( done )->
      client.waitForExist '#admin-users-content', 1000, false, done

    it 'creates a new user', ( done )->
      client
      .waitForExist '#admin-users-create', 2000
      .setValue '#admin-users-create input[name="username"]', "test_webd#{ruid}"
      .setValue '#admin-users-create input[name="email"]', "support+test#{ruid}@openanswers.co.uk"
      .selectByValue '#admin-users-create select[name="group"]', 'admin'
      .scroll '#admin-user-create-submit', -200, 0
      .scroll 0, 0
      .click '#admin-user-create-submit', done

    it 'has the new user', ( done )->
      client.waitForExist "#admin-users-table tr.admin-user-row[#{data_user}]", 2000, done

    it 'edits the user on click', ( done )->
      client
      .click "#admin-users-table tr.admin-user-row[#{data_user}]"
      .waitForVisible "#admin-users-table tr[#{data_user}] .admin-user-row-cancel", 1000, false, done

    it 'cancels the edit on clicking cancel', ( done )->
      client.click "#admin-users-table tr[#{data_user}] .admin-user-row-cancel", done

    xit 'edits the user on click', ( done )->
      client.click "#admin-users-table tr.admin-user-row[#{data_user}]", done

    xit 'cancels the edit on pressing escape', ->
    
    xit 'cancels the edit on editing a second row', ->

    xit 'warns when cancelling without saving edits', ->

    it 'modifies the new users email address', ( done )->
      client
      .click "#admin-users-table tr.admin-user-row[#{data_user}]"
      .waitForVisible "#admin-users-table tr.admin-user-row-edit[#{data_user}] input[name=\"email\"]", 2000
      .setValue "#admin-users-table tr.admin-user-row-edit[#{data_user}] input[name=\"email\"]", 'new@email.com'
      .click "#admin-users-table tr[#{data_user}] .admin-user-row-save"
      .waitForVisible "#admin-users-table tr.admin-user-row[#{data_user}]", 2000
      .getText "#admin-users-table tr.admin-user-row[#{data_user}] td:nth-child(2)"
      .then ( email )->
        expect( email ).to.equal "new@email.com"
        done()

    xit 'modifies the new users group', ->

    xit 'modifies the new users username', ->

    xit 'resets the users password', ->

    it 'edits the user on click', ( done )->
      client
      .click "#admin-users-table tr.admin-user-row[#{data_user}]"
      .waitForVisible "#admin-users-table tr[#{data_user}] .admin-user-row-delete", 2000, false, done

    it 'deletes the user', ( done )->
      client
      .click "#admin-users-table tr[#{data_user}] .admin-user-row-delete"
      .waitForExist "#admin-users-table tr.admin-user-row[#{data_user}]", 2000, true, done


  describe 'Syslog Certificates', ->

    it 'checks for the presence Syslog Certificates card', ( done )->
      client.waitForExist '#admin-certificates-content', 1000, false, done

    xit 'provides a link to the users CA cert', ->
    
    xit 'includes the the host/port name for the syslog server', ->
    
    xit 'generates a new key for common name', ->

    xit 'allows you to download the key', ->
    
    xit 'allows you to download the caertificate', ->

    xit 'cancels the edit on escape', ->

    xit 'cancels the edit on clicking cancel', ->

    xit 'deletes the new key', ->
    

  describe 'API Keys', ->

    it 'checks for the presence API Keys card', ( done )->
      client.waitForExist '#admin-apikeys-content', 1000, false, done

    created_apikey = null
    apikey_count = null

    it 'gets the number of exiting api keys', ( done )->
      client.elements ".admin-apikey-row"
      .then ( apikey_rows )->
        apikey_count = apikey_rows.value.length
        done()

    it 'creates a new API Key', ( done )->
      client.click "#admin-apikey-create-submit"
      .waitUntil ->
        this.elements ".admin-apikey-row"
        .then ( elems )->
          debug 'elems', elems.value.length
          elems.value.length is (apikey_count+1)
      .getAttribute 'table#admin-apikeys-table tr:last-child', 'data-apikey'
      .then ( apikey )->
        expect( apikey ).to.have.length 32
        expect( apikey ).to.match /^[a-z0-9]+$/i
        created_apikey = apikey
        done()

    xit 'cancels the edit on escape', ->

    xit 'cancels the edit on clicking cancel', ->

    it 'deletes the new API Key', ( done )->
      row_selector = "tr.admin-apikey-row[data-apikey=\"#{created_apikey}\"]"
      edit_row_selector = "tr.admin-apikey-row-edit[data-apikey=\"#{created_apikey}\"]"
      client.click row_selector
      .waitForVisible edit_row_selector
      .click "#{edit_row_selector} .admin-apikey-row-delete"
      .waitUntil ->
        this.elements ".admin-apikey-row"
        .then ( elements )->
          elements.value.length is (apikey_count)
      .then -> done()


  describe 'Integrations', ->

    xit 'checks for the presence Integrations card', ( done )->
      client.waitForExist '#admin-integrations-content', 1000, false, done

    xit 'provides a drop down with integrations', ->

    describe 'HTTP', ->

    describe 'ZenDesk', ->

    describe 'SES', ->
    
    describe 'SNS', ->
    

  describe 'Columns/Fields', ->

    xit 'checks for the presence Columns/Fields card', ( done )->
      client.waitForExist '#admin-columns-content', 1000, false, done


# Clean up cookies for the next test/run
# after ( done )->
#   return done() unless client
#   client.end done
