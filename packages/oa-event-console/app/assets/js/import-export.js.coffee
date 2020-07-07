
#class IOFile 
#
#  @uploader = {}
#  @uploaderInput = new SocketIOFileUpload( socket )


# onload
$ ->

  IETool = ImportExport.start()

  $("#data-export.btn").on 'click', ->
    ImportExport.saveAs()

  $("#rule-activate.btn").on 'click', ->
    ImportExport.activate()

  # hide the activate button on the page until ready
  $('#rule-activate').hide()

  socket.on "event_rules::validation", (validation)->
    console.log "Did rules validate?"
    console.table validation
    if validation.status is "success"
      $('#siofu_input').hide()
      $('#rule-activate').show()
      $('#rule-filename').text(validation.filename)
      ImportExport.validation( validation )
      Message.info "Rules validated - ready to activate"
    else
      Message.error "Rule import failed"

      console.log "Failed validation"

  socket.on "event_rules::available", (availableRules)->
    if availableRules.names
      console.table availableRules.names

  
class ImportExport

  @uploaderInput = {}
  @upper
  @validated_filename
  @logger = debug 'oa:event:import-export'

  @start: ()->
    @upper = new ImportExport

  constructor: ()->
    @upload = {}
    @uploader = {}
    @startit()

  @saveAs: ->
    @fetchRules {}, (data)->
      blob = new Blob [data], {type: "application/yaml"}
      saveAs blob, "rules.yaml"

  startit: ->
    @uploader = new SocketIOFileUpload socket
    inputElement =  $('#siofu_input')[0]

    @uploader.listenOnInput inputElement
    @uploader.addEventListener "start", (ev)->
      ev.file.meta.operation = "rules-import"
      ImportExport.logger "START ev", ev

    @uploader.addEventListener "progress", (ev)->
      ImportExport.logger "progress ev", ev

    @uploader.addEventListener "error", (ev)->
      ImportExport.logger "error ev", ev
      if ev.message
        Message.error ev.message

  @fetchRules: (options, cb)->

    socket.emit "event_rules::read::raw", {type:'server'}, (error,data)->
      if error
        console.error 'socketio error', error.message
      else
        cb data
    
  @validation: (data)->
    @validated_filename = data.filename

  @activate: ()->
    socket.emit "event_rules::activate", {filename: @validated_filename}, (error, data)->
      if error
        Message.error "Failed to activate rules"
      else
        Message.info "Rules activated"

      $('#siofu_input').show()
      console.log "activated rule", data
      $('#rule-activate').hide()
