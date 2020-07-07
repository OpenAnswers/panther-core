
debug_apiconsole = debug 'oa:event:console:apiconsole'


# On load
$ ->
  new Clipboard (".btn")

  ApiConsole.render()
  ApiConsole.handlers()
  ApiConsole.handler_output_change()
  ApiConsole.set_apikey_copy()


  $(".output-builder").tooltip({
    tooltipClass: 'ui-tooltip-arrow-top'
  })

# ### ApiConsole

class ApiConsole extends Rendered

  @logger = debug_apiconsole

  @option_template = $('#template-apiconsole-option').html()
  # @options_template = $('#template-apiconsole-options').html()
  # @select_template = $('#template-apiconsole-select').html()
  # @fields_template = $('#template-apiconsole-fields').html()
  # @body_template = $('#template-apiconsole-textarea').html()
  # @curl_template = $('#template-apiconsole-readonly').html()
  
  Mustache.parse @option_template
  # Mustache.parse @options_template
  # Mustache.parse @select_template
  # Mustache.parse @fields_template
  # Mustache.parse @body_template
  # Mustache.parse @curl_template

  @.$container = $('#apiconsole-event')

  @api =
    server:
      scheme: 'http'
      host: 'localhost'
      port: '5001'

    endpoints:
      event:
        label: 'Event API'
        tag: 'Create or Queue events via the HTTP Agent API'
        fields: [
          id: 'event-type'
          label: 'Request'
          type: 'radio-inline'
          data_type: 'string'
          options: [
            id: 1
            value: 'create'
            label: 'Create Event'
          ,
            id: 2
            value: 'queue'
            label: 'Queue Event'
          ]
        ,
          id: 'apikey'
          label: 'API Key'
          type: 'select'
          data_type: 'string'
          options: [
            id: 1
            value: 'Api Data Value1'
            lable: 'Api Data Name1'
          ,
            id: 2
            value: 'Api Data Value2'
            lable: 'Api Data Name2'
          ]
        ,
          id: 'node'
          label: 'Node'
          type: 'text'
          data_type: 'string'
        ,
          id: 'tag'
          label: 'Tag'
          type: 'text'
          data_type: 'string'
        ,
          id: 'summary'
          label: 'Summary'
          type: 'text'
          data_type: 'string'
        ,
          id: 'severity'
          label: 'Severity'
          type: 'text'
          placeholder: 'integer'
          data_type: 'integer'
        ]

  constructor: ->


  @render: ( options )->
    tokens_data = for token in global_api_tokens
      data =
        value: token
        label: token
    @logger 'rendering token data', data
    $('#input-apikey').html Mustache.render(@option_template, options: tokens_data)

  @handlers: ( options )->
    self = @
    #super options

    # on body change build curl/request
    # set modified flag for field warning
    $('.output-builder').on 'input change', ( ev )->
      self.handler_output_change()
    # on forms cahnge build body

    $('#btn-send').on 'click', ( ev )->
      $btn = $(this)
      ev.preventDefault()
      ev.stopPropagation()
      self.handler_send( $btn )
      false

  @handler_send: ( $btn )->
    self = @
    $btn.button('loading')
    details = @dom_to_obj()
    url = @build_url details
    json_data = JSON.stringify(details.body)

    $.ajax url,
      type: 'POST',
      data: json_data
      contentType: 'application/json'
      dataType: 'json'
      processData: false
      #jsonp: false
      headers:
        'X-Api-Token': details.apikey
      success: ( data, status, other )->
        $btn.button('reset')
        self.logger 'success', data, status, other
        response_str = JSON.stringify data, null, 2
        $('#output-response').html $('<pre>',text:response_str)
      error: ( response, error_text, error_thrown )->
        self.logger 'failure [%s]', error_text, response, error_thrown
        if response.status is 0
          response_str = "There was an error sending your request"
        else
          response_str = 'Error '+response.status+'\n'+response.responseText
        $('#output-response').html $('<pre>',text:response_str)
      complete: ->
        $btn.button('reset')


  @handler_reset: ->
    details = @dom_to_obj()
    @set_body details
    @set_curl details
    @set_url details

  @handler_output_change: ->
    details = @dom_to_obj()
    @set_body details
    @set_curl details
    @set_url details
    @set_apikey_copy()

  @render_custom: ( users )->
    @set_selected_group users

  @build_url: ( obj )->
    url = if global_api_url then global_api_url else 'http://localhost:5001'
    "#{url}/api/event/#{obj.eventtype}"

  @set_url: ( details )->
    url_val = @build_url details
    @logger 'url value', url_val
    $('#output-url').val url_val

  @build_curl: ( obj )->
    json_body = JSON.stringify obj.body
    url =  @build_url obj
    cmd = [
      "curl -X POST"
      "-H 'X-Api-Token: #{obj.apikey}'"
      "-H 'Content-Type: application/json'"
      "-d '#{json_body}'"
      "'#{url}'"
    ]
    cmd.join ' '

  @set_curl: ( details )->
    curl_val = @build_curl details
    @logger 'curl value', curl_val
    $('#output-curl').val curl_val
    @set_curl_copy()

  @build_body: ( obj )->
    body = JSON.stringify obj.body, null, 2

  @set_body: ( details )->
    body_val = @build_body details
    @logger 'body value', body_val
    $('#output-body').val body_val

  @dom_to_obj: ->
    o =
      eventtype: "create"
      apikey: $('#input-apikey').val()
      body:
        event: 
          node: $('#input-node').val()
          tag: $('#input-tag').val()
          summary: $('#input-summary').val()
          severity: parseInt( $('#input-severity').val() )
    o

  @validate: ->

  @set_apikey_copy: ->
    apikey = $("#input-apikey option:selected").text()
    $( "#btn-copyapi" ).attr( "data-clipboard-text", apikey );

  @set_curl_copy: ->
    curl_command = $('#output-curl').val()
    $( "#btn-copycurl" ).attr( "data-clipboard-text", curl_command );
