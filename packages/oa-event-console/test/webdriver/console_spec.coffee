debug    = require( 'debug' )( 'oa:test:webdriver:console' )
{ expect, Web } = require '../mocha_helpers'
{ WebDriver } = require '../mocha_helpers_webdriver'


# Mock the db with a single record
#require ../db_mock

 
# Test setup (from ENV)
web = Web.from_env_or_default()

# Store a global client
client = null
reverse = true
app = null


# Onto the tests

# Boot the app
before (done) ->
  @timeout 20000
  app = Web.boot_complete_app(done)

# Setup the client before anything else
before ( done )->
  @timeout 20000
  WebDriver.fetch_authenticated_client web, ( err, res )->
    client = res
    done(err)


describe 'The Consoles', ->

  # Some generic event selectors
  first_record = '#grid_event_grid_records tr[line="1"]'
  first_field = 'td[col="0"]'
  first_record_first_field = "#{first_record} #{first_field}"
  second_record = '#grid_event_grid_records tr[line="2"]'
  second_field = 'td[col="1"]'
  second_record_second_field = "#{second_record} #{second_field}"

  # Set a slightly higher timeout for all tests
  @timeout 5000

  it 'goes to /console', ( done )->
    client.url web.url + '/console', done

  it 'has a grid', ( done )->
    client.waitForExist '#grid_event_grid_body', 2000, done

  describe 'Default View events', ->

    it 'should have a first record', ( done )->
      client.waitForExist first_record, 3000, done

    it 'should have a second record', ( done )->
      client.waitForExist second_record, 500, done

    it 'should have a first record with custom background severity class', (done) ->
      client.getAttribute first_record, 'class', ( err, value )->
        done(err) if err
        expect( value ).to.match /severity-\d+/i
        done()


  describe 'All View', ->

    xit 'selects the All view with fancy javascript event monitor', (done)->
      client
      .click 'div.console-toolbar-views > div.section-label'
      .waitForVisible 'a[data-viewname="All"]'
      .timeoutsAsyncScript 30000
      .executeAsync ( cb )->
        window.selenium_grid_refresh_callback = ()->
          cb null, 'grid refresh fired'
      , (err, res) ->
        debug 'error', err, res
        done(err)
      .timeoutsAsyncScript 1000
      .executeAsync ()->
        #w2ui.event_grid.on 'refresh', window.selenium_grid_refresh_callback
        setTimeout ->
          window.selenium_grid_refresh_callback()
        , 500
      .click 'a[data-viewname="All"]'

    it 'should set the All view', (done)->
      client
      .click 'div.console-toolbar-views > div.section-dropdown > .dropdown > button'
      .waitForVisible 'a[data-viewname="All"]'
      .click 'a[data-viewname="All"]'
      # .waitForText 'div.console-toolbar-views > div.section-dropdown > .dropdown > button', (err, text) ->
      #   expect( text ).to.equal true
      #   done()
      .waitUntil ->
        debug 'wait for text All'
        this.getText('div.console-toolbar-views > div.section-dropdown > .dropdown > button').then (text)->
          debug 'waited 50 for', text
          text.match /All/
      , 1500, 50
      .then ->
        done()
      .catch done

    it 'should have a first record', (done)->
      client
      .waitForExist first_record, 2000
      .then -> done()


    describe 'Context menu', ->

      it 'clicks the body and clears selection', (done) ->
        client
        .click 'body'
        .saveScreenshot WebDriver.screen_shot_path('record_click.png')
        .getAttribute first_record, 'class'
        .then ( classes )->
          expect( classes ).to.not.match /w2ui-selected/
          expect( classes ).to.match /severity-/
          done()
        .catch done

      it 'pops up the context menu', (done) ->
        @timeout 1000
        client
        .rightClick second_record_second_field
        .waitForVisible '#console-context-menu', 1000
        .isVisible '#console-context-menu'
        .then ( isVisible )->
          expect( isVisible ).to.equal true
          done()
        .catch ( error )->
          client.saveScreenshot WebDriver.screen_shot_path('failed.png')
          done(error)

      it 'clears the second record', (done) ->
        first_record_text = 'nothing'
        client
        .click 'body'
        .rightClick second_record_second_field
        .waitForVisible '#console-context-menu', 1000
        .click "#console-context-menu a[action='clear']"
        .waitForVisible '#console-context-menu', 1000, true
        .pause 50
        .getAttribute second_record, 'class'
        .then (classes)->
          expect( classes ).to.match /severity-0/
          done()
        .catch done


      describe 'acknowledges the first record', ->

        first_record_text = 'nothing'

        it 'retreives the first record text', ( done )->
          client.click 'body'
          .getText first_record
          .then ( text )->
            first_record_text = text
            done()
        
        it 'opens the context menu', ( done )->
          client.rightClick first_record_first_field
          .waitForVisible '#console-context-menu', 1000, done
        
        it 'clicks the ack button', ( done )->
          client.click "#console-context-menu a[action='acknowledge']"
          .waitForVisible '#console-context-menu', 1000, true
          .pause 50, done
        
        it 'record should remove the bold highlighting', ( done )->
          client.getCssProperty first_record, "font-weight"
          .then ( weight )->
            debug 'weight',weight
            expect( weight.value ).to.equal web.browser_css_weight_normal()
            done()

        it 'w2ui record data is set to ack', ( done )->
          client.execute ->
            record = w2ui['event_grid'].records[0]
          .then ( record )->
            expect( record ).to.have.property 'value'
            expect( record.value ).to.have.property 'acknowledged'
            expect( record.value.acknowledged ).to.equal true
            done()


      describe 'uncknowledges the first record', ->

        first_record_text = 'nothing'

        it 'retreives the first record text', ( done )->
          client.click 'body'
          .getText first_record
          .then (text)->
            first_record_text = text
            done()

        it 'opens the context menu', ( done )->
          client.rightClick first_record_first_field
          .waitForVisible '#console-context-menu', 1000, done

        it 'click the unack button', ( done )->
          client.click "#console-context-menu a[action='unacknowledge']"
          .waitForVisible '#console-context-menu', 1000, true
          .pause 50, done

        it 'record should have bold highlighting', ( done )->
          client.getCssProperty first_record, "font-weight"
          .then ( weight )->
            debug 'weight',weight
            expect( weight.value ).to.equal web.browser_css_weight_bold()
            done()

        it 'w2ui record data is set to unack', ( done )->
          client.execute ->
            record = w2ui['event_grid'].records[0]
          .then ( record )->
            expect( record ).to.have.property 'value'
            expect( record.value ).to.have.property 'acknowledged'
            expect( record.value.acknowledged ).to.equal false
            done()


      describe 'assigns the first record to test1', ->

        first_record_text = null

        it 'gets the text for the first record', (done) ->
          client
          .click 'body'
          .getText first_record
          .then ( text )->
            debug 'text', text
            first_record_text = text
            done()

        it 'opens the context menu', ( done )->
          client
          .rightClick first_record_first_field
          .waitForVisible '#console-context-menu', 1000
          .then -> done()

        it 'opens the assign sub menu', ( done )->
          client
          .moveToObject   '.console-context-assign'
          .waitForVisible 'a[action="assign"][user="test1"]'
          .then -> done()

        it 'assigns to test1', ( done )->
          client
          .click 'a[action="assign"][user="test1"]'
          .then -> done()

        it 'should update the first records user text to test1',  ( done )->
          @timeout 3000
          client
          .waitUntil ->
            WebDriver.waitForText this, first_record, ( text )->
              text.match /\ntest1\n/
          , 3000, 100
          .getText first_record
          .then (text)->
            expect( first_record_text ).to.be.ok
            expect( text ).to.not.equal first_record_text
            expect( text ).to.match /\ntest1\n/
            done()
          .catch done

      it 'deletes the first record', (done) ->
        first_record_text = 'nothing'
        client
        .click 'body'
        .getText first_record, ( text )->
          first_record_text = text
        .rightClick first_record_first_field
        .waitForVisible '#console-context-menu', 1000
        .moveToObject ".console-context-tools"
        .moveToObject 'a[action="delete"]'
        .waitForVisible 'a[action="delete"]', 1000
        .click 'a[action="delete"]'
        .isVisible('#console-context-menu').then ( isVisible )->
          expect( isVisible ).to.equal false
        .getText(first_record).then ( text )->
          expect( first_record_text ).to.not.equal text
          done()
        .catch done

      it 'screen shots the final state', ( done )->
        client
        .saveScreenshot WebDriver.screen_shot_path('console_test_end.png')
        .then done


    describe 'event detail', ->

      it 'displays the modal', (done) ->
        client
        #.doubleClick second_record
        .click second_record
        .click second_record
        .pause 100
        .saveScreenshot WebDriver.screen_shot_path('record_double_click.png')
        .waitForVisible '#event-details-modal', done
        .catch done
        
      it 'closes the modal via any dismiss button', (done) ->
        client
        .saveScreenshot WebDriver.screen_shot_path('record_double_click_close_0_before.png')
        .click '.modal-dialog button[data-dismiss="modal"]'
        .waitForVisible '#event-details-modal', 1000, true
        .pause 100
        .saveScreenshot WebDriver.screen_shot_path('record_double_click_close_1_after.png')
        .catch done
        .getAttribute(first_record, 'class').then ( classes )->
          expect( classes ).to.match /severity-/i
          done()
        .catch done

      it 'displays the modal', ( done )->
        client
        .click second_record
        .click second_record
        .waitForVisible '#event-details-modal', done
        .catch done

      it 'toggles event to acknowledged', (done)->
        client
#        .waitForVisible 'button.event-detail-acknowledge'
        .click 'button.event-detail-acknowledge'
        .waitForVisible 'button.event-detail-unacknowledge'
        .getCssProperty(second_record, "font-weight").then ( weight )->
          expect( weight.value ).to.equal web.browser_css_weight_normal()
          done()
        .catch done

      xit 'toggles the event to unacknowledged', (done)->
        #done()

      xit 'presses the rest of the buttons', (done)->
        done()

      it 'closes the modal via anything', (done) ->
        client.click '.modal-dialog button[data-dismiss="modal"]'
        .pause 100
        .waitForVisible '#event-details-modal', 1000, true, done
        .catch done


# Clean up cookies for the next test/run
after (done) ->
  return done() unless client
  client.end done

