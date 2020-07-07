
# Logging
debug      = require( 'debug' )( 'oa:test:unit:integration' )

# Helpers
{ expect } = require '../mocha_helpers'

# Test setup
{ Integration
  Integrations
  HttpIntegration
  ZendeskTicketIntegration } = require '../../lib/integrations'



describe 'Integrations', ->

  it 'class has types', (done) ->
    expect( Integrations.types ).to.be.an.instanceof Object
    done()

  it 'class has types_description', (done) ->
    expect( Integrations.types_description ).to.be.an.instanceof Object
    done()


  describe 'types property', ->

    it 'has the HttpIntegration type', (done) ->
      expect( Integrations.types.http ).to.equal HttpIntegration
      done()

    it 'has the ZendeskTicketIntegration type', (done) ->
      expect( Integrations.types.zendesk_ticket ).to.equal ZendeskTicketIntegration
      done()


  describe 'types description', ->

    it 'has the ZendeskTicketIntegration description', (done) ->
      zendesk_ticket_description =
      {
        "input": [
          {
            "label": "Name"
            "name": "name"
            "placeholder": "This name will appear in the context menu"
            "type": "text"
            "validation": /^[\w\s]+$/
          }
           {
            "aftertext": ".zendesk.com"
            "label": "Subdomain"
            "name": "subdomain"
            "placeholder": "your_domain"
            "type": "text"
            "validation": /[^\s_]/
           }
           {
            "label": "Email"
            "name": "email"
            "placeholder": "email@domain.com"
            "type": "email"
           }
          {
            "label": "Authentication"
            "name": "auth"
            "placeholder": "Token or Password"
            "type": "select_string"
            "types": [
              "Token"
              "Password"
            ]
          }
          {
            "label": "Ticket Settings"
            "type": "divider"
          }
          {
            "label": "Type"
            "name": "ticket_type"
            "type": "select"
            "values": [
              "Incident"
              "Problem"
              "Question"
              "Task"
            ]
          }
          {
            "label": "Priority"
            "name": "ticket_priorities"
            "type": "select"
            "values": [
              "Urgent"
              "High"
              "Normal"
              "Low"
            ]
          }
          {
            "label": "Subject"
            "name": "ticket_subject"
            "placeholder": "Subject with event {fields}"
            "type": "text"
          }
          {
            "label": "Comment"
            "name": "ticket_comment"
            "placeholder": "Comment with event {fields}"
            "type": "textarea"
          }
         ]
        "name": "ZenDesk Ticket"
      }

      expect( Integrations.types_description.zendesk_ticket ).to.eql zendesk_ticket_description
      done()

    it 'has the HttpIntegration description', (done) ->
      http_description =
        "input": [
           {
            "label": "Name"
            "name": "name"
            "placeholder": "This name will appear in the context menu"
            "type": "text"
            "validation": /^[\w\s]+$/
          }
          {
            "label": "Method"
            "name": "method"
            "type": "select"
            "values": [
              "GET"
              "POST"
              "PUT"
              "DELETE"
            ]
          }
          {
            "label": "URL"
            "name": "url"
            "type": "text"
            "validation": ""
          }
          {
            "label": "Header"
            "name": "header"
            "type": "text"
          }
          {
            "label": "Body"
            "name": "body"
            "type": "textarea"
          }
        ]
        "name": "HTTP Request"

      expect( Integrations.types_description.http ).to.eql http_description
      done()


#  describe 'ZendeskTicketIntegration', ->
#
#    it 'builds an object', (done) ->
#      debug 'ZendeskTicketIntegration', ZendeskTicketIntegration
#      console.log "ZEN ", ZendeskTicketIntegration
#      zendesk_instance = new ZendeskTicketIntegration 'fieldname', 'value'
#      expect( zendesk_instance ).to.be.an.instanceof ZendeskTicketIntegration
#      done()


  describe 'HttpIntegration', ->

    it 'builds an object', (done) ->
      debug 'HttpIntegration', HttpIntegration
      http_instance = new HttpIntegration 'fieldname', 'value'
      expect( http_instance ).to.be.an.instanceof HttpIntegration
      done()


  describe 'HttpRedirectIntegration', ->

    xit 'nothing to see here', ->
      #nothing


  describe 'CreateNewRuleIntegration', ->

    xit 'nothing to see here', ->
      #nothing


  describe '#instance', ->

    ev = null

    beforeEach (done) ->
      done()

    xit 'Nothing defined yet', (done) ->
      a = Action.generate
        discard: true
      a.run ev
      expect( ev.discarded() ).to.equal true
      done()

