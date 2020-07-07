# # Groups

# For storing many Group of rules

# Group rules are a little bit special as the RuleSet
# is housed in a group instead of directly in EventRules
# This means Group needs to implement a number of EventRulesy
# things. And they need to be treated a little bit special 
# in some places

# --------------------------------------
# ## Class Groups

# Groups is the collection of Group
class Groups extends Rendered

  @logger = debug 'oa:event:rules:groups'
  
  @dom_class = 'rule-groups'
  @dom_name = 'rule-groups'
#  @template_id = '#template-groups'

  @container_el ='ul'

#  @template_setup()

  # Generate an instance from the yaml model 
  @generate: ( yaml_def, options = {} )->
    @logger 'generating', yaml_def, options

    options.yaml = yaml_def
    new @ options

  # Create a store for Group
  constructor: ( options = {} )->
    super()
    @logger = @constructor.logger
    @store = {}
    @store_order = []
    #@template_none = true
    @event_rules = options.event_rules
    @yaml = options.yaml
    @build_from_yaml() if @yaml
    # Set the standard Rendered element
    @rendered_init options
    @logger 'new Groups created', @store


  build_from_yaml: ( yaml = @yaml)->

    # Deal with the possible store `_order` first
    @store_order = unless _.isArray(yaml._order)
      console.error "No _order array in groups yaml, defaulting to keys"
      _.remove _.keys(yaml), '_order'
    else
      yaml._order

    # Then build the groups
    for name in @store_order
      unless yaml[name]
        throw new Error "Group in _order is not in groups" 
        
      options =
        name: name
        groups: @
        event_rules: @event_rules
      @logger 'Generating group with group options', options
      @add name, Group.generate @yaml[name], options

    true

  count: -> _.keys(@store).length

  add: ( name, group )->
    @logger 'groups', @store
    @store[name] = group

  del: ( name )->
    get_group name
    delete @store[name]

  get_group: ( name )->
    throw new Errors.ValidationError "No group [#{@store}]" unless @store[name]
    @store[name]

  # Create a new dom group element for later saving to the mode
  # This will disppear on `render()` unless saved
  create_new_group: ( options = {} )->
    group = new Group
      event_rules: @event_rules
      groups: @
      name: options.name
      new: true
    @.$container.append group.render()
    group.enable_editmode()
    group.disable_delete()

  # Run a function for every group
  # Passes in the `group` object and `index`
  each_group: ( fn )->
    for group, i in @store_order
      fn @store[group], i

  collapse_all: ( flag )->
    @each_group ( group )-> group.collapse_all()

  # No template here
  render_custom: ( options = {} )->
    groups = for group_name in @store_order
      @logger 'render() group', @store[group_name].name
      @store[group_name].render()

    @.$container.append groups

  initial_handlers: ->
    super()
    self = @

    $(document).on 'click',
    '.btn-rules-group-create-group', (ev)->
      self.logger 'click .btn-rules-group-create-group'
      self.create_new_group()
      window.scrollTo(0, document.body.scrollHeight)

  enable_extra_sortable: ()->
    $groups = $("##{@euid}")
    self = @

#    $groups.sortable "enable"
    $groups.sortable
      placeholder: 'card-global-group-placeholder'
      handle: '.title'
      axis: 'y'
      start: (event, ui) ->
        self.logger "START"
        ui.item.start_position = ui.item.index()
      stop: (event, ui) ->
        msg =
          old_position: ui.item.start_position
          new_position: ui.item.index()
        self.logger "STOP", msg
        self.event_rules.socketio_Async 'event_rules::group::move', msg, {}
        .then (res) ->
          self.logger 'group moved', res
        .catch ( error )->
          Message.error "Failed to reorder groups", error



  # ###### @enable_sortable()
  enable_sortable: () ->
    #@.$container.sortable "enable"
    for group in @store_order
      @store[group].enable_sortable()

  # ###### @disable_sortable()
  disable_sortable: ->
    for group in @store_order
      @store[group].disable_sortable()