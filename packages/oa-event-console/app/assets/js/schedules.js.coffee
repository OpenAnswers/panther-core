
# ## Schedules
debug_schedule = debug "oa:event:rules:schedules"

# onload
$ ->
  Schedules.send_read_all()

  debug_schedule "SCHEDULESCLASS"

  socket.on 'schedules::updated', (updates)->
    Schedules.send_read_all()

  $('#rules-schedule-create').on 'submit', (ev)->
    ev.preventDefault()

    debug_schedule "Creating a new schedule..."
    data = {
      days: []
    }
    $(ev.target).serializeArray().forEach (x)->
      data["name"] = x.value if x.name == "schedule-name"
      data["start"] = x.value if x.name == "schedule-start"
      data["end"] = x.value if x.name == "schedule-end"
      data.days.push x.value if x.name == "days"

    Schedules.send_create data, (error, response)->
      if error
        return Message.error ErrorType.from_object( error )
      else
        Message.info_label 'Schedule',  'created / updated'
        

  $('#rules-schedules-table').on 'click', 'tr.rules-schedule-row .rules-schedule-edit-row', (ev)->
    debug_schedule "ROWCLICK"
    id = Schedules.this_row_id ev.target
    Schedules.edit_row id
  
  $('#rules-schedules-table').on 'click', 'tr.rules-schedule-row .rules-schedule-update-button', (ev)->
    debug_schedule "update row"
    id = Schedules.this_row_id ev.target
    Schedules.send_update_days id

  $('#rules-schedules-table').on 'click', 'tr.rules-schedule-row .rules-schedule-delete-button', (ev)->
    debug_schedule "delete row"
    id = Schedules.this_row_id ev.target
    Schedules.delete_row id



  
class Schedules

  @logger = debug_schedule
  @schedules_template = $('#rules-schedules-template').html()
  Mustache.parse @schedules_template
  @schedules_el = $('#rules-schedules-table')
  @schedule_names: []

  @this_row_id: ( that )->
    $(that).parentsUntil('tr.rules-schedule-row').parent().data 'id'

  @get_form: (id)->
    dow_inputs = $("form.rules-schedule-edit-row[data-id=\"#{id}\"]")
    #dow_inputs = $('#schedule-'+id + ' input.rules-schedule-dow')
    @logger "DOWs, ", dow_inputs
    dow_inputs

  @get_schedule_row: (id) ->
    $("tr[data-id=\"#{id}\"]")

  @unhide_update_button: (id) ->
    update_button = $("tr[data-id=\"#{id}\"] button.rules-schedule-update-button")
    update_button.removeClass 'hidden'

  @hide_update_button: (id) ->
    update_button = $("tr[data-id=\"#{id}\"] button.rules-schedule-update-button")
    update_button.addClass 'hidden'


  @edit_row: (id) ->
    @logger " EDITING ROW: ", id
    @unhide_update_button id

#    @logger "EDITED data", data
#    self = @
#    socket.emit "schedule::update::days", data, (error, response)->
#      self.logger "schedule::update::days with", error, response
#      if error
#        return Message.error ErrorType.from_object( error )

      
  @delete_row: (id) ->
    data = { uuid: id }
    self = @
    socket.emit "schedule::delete", data, (error, response) ->
      self.logger "schedule::delete response", error, response
      if error
        return Message.error ErrorType.from_object( error )

  @render_schedules: (schedules)->
    debug_schedule "Rendering...", schedules
    schedules.forEach (schedule)->
      schedule.days.forEach (day)->
        schedule[day] = true
    @schedules_el.html Mustache.render( @schedules_template, schedules: schedules)


  @startit: ->
    socket.emit "schedules::read", {}, (error,data)->
      debug_schedule data

    socket.emit "schedule::read", {name: "out of hours"}, (error,data)->
      console.log " OOH ", data

    true
    

  @send_read_all: (cb)->
    socket.emit "schedules::read", {}, (error,response)->
      debug_schedule "read schedule data", response.data
      Schedules.render_schedules response.data

  @send_create: (data, cb)->

    debug_schedule "Sending...", data

    payload = 
      name: data.name
      start: data.start
      end: data.end
      days: data.days
    socket.emit 'schedule::create', data: payload, ( error, response )->
      debug_schedule "Created schedule returned", response
      unless error
        debug_schedule "created"

      if cb then cb( error, response)

  @send_update: (data, cb)->

    payload = 
      name: data.name
      start: data.start
      end: data.end
      days: data.days

    socket.emit 'schedule::update', data: payload, (error,response)->
      debug_schedule 'Update schedule returned', response

      if cb then cb(error, response)

  @send_update_days: (id) ->
    formData = @get_form(id).serializeArray()
    @logger "ROW", formData
    days = formData.map (d) ->
      d.value
    data = 
      uuid: id
    data.days = days

    self = @
    socket.emit "schedule::update::days", data, (error, response)->
      self.logger "schedule::update::days with", error, response
      if error
        return Message.error ErrorType.from_object( error )
      self.hide_update_button id


  @send_delete: ( data, cb ) ->
    payload = 
      name: data.name

    socket.emit 'schedule::delete', { data: payload }, (error, response) ->
      debug_schedule 'Deleting schedule returned', response

      if cb then cb(error, response)
