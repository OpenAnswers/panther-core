
$ ->
  $('#form').w2form
    name     : 'form'
    url      : 'server/post'
    header   : 'Field Types'
    #formURL  : 'data/form.html'
    fields: [
      { field: 'Name',  type: 'text', required: true },
      { field: 'Company', type: 'alphaNumeric', required: true },
      { field: 'Phone',   type: 'int', required: true },
      { field: 'Pi', type: 'float', required: true },
      { field: 'Birth date',  type: 'date' },
      { field: 'List',  type: 'list', required: true, options: { items: [ 'Pluto', 'Lassie', 'Laika', 'Scooby' ] } }
      { field: 'Enum', type: 'enum', required: true, options: { items: ['Adams, John', 'Johnson, Peter', 'Lewis, Frank', 'Cruz, Steve', 'Donnun, Nick'] } },
      { field: 'field_textarea', type: 'text'},
      { field: 'field_select', type: 'select', required: false, options: { items: ['eu-west-1', 'us-east-1', 'ap-south-1'] } },
      { field: 'Event Console', type: 'checkbox', required: false },
    ]
    actions:
      reset: ->
        this.clear()
      save: ->
        obj = this
        this.save {}, (data) ->
          if data.status == 'error'
            console.log 'ERROR: '+ data.message
          obj.clear()