
# logging modules
{logger, debug} = require('oa-logging')('oa:event:rules:event_rules')

# npm modules
Promise = require 'bluebird'
yaml    = require 'js-yaml'
tmp     = Promise.promisifyAll require('tmp')
moment  = require 'moment'

# node modules
fs      = Promise.promisifyAll require('fs')
mvAsync = Promise.promisify require('mv')
path    = require 'path'
git     = Promise.promisifyAll require('gift')


# oa modules
Errors          = require 'oa-errors'
{throw_error, _, delay, objhash} = require 'oa-helpers'

{RuleSet} = require './rule_set'
{Groups}  = require './groups'
{Event}   = require './event'

{Action}  = require './action'
{Select}  = require './select'
{Option}  = require './option'

{Agents}  = require './agents'
{Schedules} = require './schedules'




# ## EventRules

# EventRules is the grouping of all the rules for the event system
# It houses the syslog rules, global rules, group rules and metadata
# for the rules system
#
# `@globals` has the global RuleSet
# `@groups` contains the RuleSet for each group, by key

class @EventRules

  @load: (path) ->

    debug 'Reading yaml file', path
    data = fs.readFileSync path

    # this is an _unsafe_ load for regex objects
    doc  = yaml.load data

    #catch e
      #logger.error 'Error loading yaml', e

  # convenience static to commit and push a file
  @git_commit_and_push: (yaml_path, msg, opts = {})->
    unless opts.git_push
      logger.warn "Attempting to commit,push but GIT is disabled at #{yaml_path}"
      return Promise.resolve true

    new Promise ( resolve,reject)->
      # setup paths
      path_repo = path.dirname yaml_path
      yaml_filename = path.basename yaml_path
      # setup repo as promised
      repo = Promise.promisifyAll git(path_repo)
      repo.commitAsync msg,
        all: true
        author: "#{opts.user_name} <#{opts.user_email}>"
      .then (res)->
        logger.info "Committed", res
        repo.remote_pushAsync 'origin', 'master'
      .then ( res )->
        resolve res
      .catch (err)->
        logger.error "Commit failed", err
        reject err


  
  constructor: ( opts = {} ) ->
    debug 'creating new EventRules with:', opts
    #@cb   = opts.cb || ->

    # Option, reload_rules automatically
    @reload_rules = opts.reload_rules || true

    # rules are being saved
    # FIXME: 0 - working
    @saving_counter = 0

    # git commit msgs
    @edit_msgs = []
    
    # Callback to run on rules reload
    @reload_cb = opts.reload_cb || null
    
    # yaml doc
    @doc = opts.doc
 
    # path to yaml
    @path = opts.path #|| @constructor.default_path()
    
    # Queue of watch events
    @watch_events = []

    if opts.server
      @type = 'server'
    else if opts.agent
      @type = 'agent'
    else
      @type = 'none'
    
    if @doc
      @build_from_yaml()
    else
      @load_yaml()

    @watch_rules() if @path


  build_from_yaml: ()->
    debug 'Generating rules object for:', @doc, @type
    switch @type
      when 'server'
        logger.info 'Generating server rules from doc'
        @generate_rules_server @doc
      when 'agent'
        logger.info 'Generating agent rules from doc'
        @generate_rules_agent @doc
      when 'none'
        logger.info 'Generating rules from doc'
        @generate_rules @doc
    
    @edited = false

  # ###### watch_rules()

  # Uses a queue and delay of 1 second so things like truncating the
  # file before writing it out don't get picked up
  # Not perfect if there are lots of seperate events triggered on the
  # file but good enough for the moment
  watch_rules: ()->
    @stop_rules_watch()
    return unless @reload_rules
    self = @
    watch_dir = path.dirname @path
    watch_file = path.basename @path
    logger.info 'Setting up file watch on [%s] for [%s]', watch_dir, watch_file
    @watch = fs.watch watch_dir, ( event, path )->
      debug 'change detected ev[%s] path[%s]', event, path
      return unless path is watch_file
      logger.info "Rules file changed, waiting 1 seconds for node fs.watch", path, event
      
      self.watch_events.push {event: event, path: path}
      
      # Delay a bit so multiple quick events are batched
      # into a single reload
      delay 1000, ->
        debug 'timer for watch change is running', self.watch_events.length
        return unless self.watch_events.length > 0
        self.reload( event, path )
        self.watch_events = []

  stop_rules_watch: ()->
    if @watch and @watch.close
      @watch.close()
    else
      false

  # ###### @load_yaml( path )
  # Load a yaml file into the rules object model
  load_yaml: ( yaml_path = @path )->
    @doc  = @constructor.load yaml_path
    @build_from_yaml()


  # ###### @reload()
  # Reload the file on disk.
  # Used for discarding in memory changes.
  reload: ( ev = 'reload', evpath = @path )->
    @load_yaml()
    @reload_cb ev, evpath if @reload_cb

 
  # ###### have_edits()
  # Flag to check if a rule set has modification that
  # have not been saved
  have_edits: ->
    @edited


  # ###### set_edited_flag()
  # Set the edited flag
  set_edited_flag: ->
    @edited = true

  append_edited_msg: (msg)->
    @edit_msgs.push msg
    logger.debug "APPENDING msg ", msg

  have_edited_msgs: ->
    @edit_msgs.length > 0

  # ###### @to_yaml_obj( options )
  # Dump the rules back to yaml format
  #
  # Options:
  #
  # - `hash` `true/false` a sha1 hash of the complete yaml object
  #    will be attached.
  to_yaml_obj: ( options = {} )->
    o = {}
    if @agent
      o.agent = @agent.to_yaml_obj()
    if @globals
      o.globals =
        rules: @globals.to_yaml_obj()  # Why does this need `rules:`?
    if @groups
      o.groups = @groups.to_yaml_obj()

    if @schedules
      o.schedules = @schedules.to_yaml_obj()
    if options.hash
      hash = objhash o
      o.hash = hash
    
    o.metadata = {}
    o.metadata.save_date = Date.now()
    o


  # ###### @to_yaml()
  # Convert to yaml text
  to_yaml: ( options )->
    yaml.dump @to_yaml_obj(options)

  
  # ###### @save_yaml_async()
  #
  # Save event rules back to the yaml file, first creating a
  # temp file, moving the current file to a backup, then moving
  # the temp file into place.
  #
  save_yaml_async: ( yaml_path = @path )->
    self = @
    new Promise ( resolve, reject )->
      # mv file to file.date
      # save new file

      #return true

      # increment lock and test
      self.saving_counter +=1
      debug 'saving_counter = ', self.saving_counter
      unless self.saving_counter == 1
        logger.error 'ASSERT saving counter', self.saving_counter
        return reject( "rules are being saved by someone else" )

      doc = self.to_yaml()

      debug 'save_yaml generated a yaml doc', "\n" + doc

      tmp_path = ''
      tmp_cleanup_cb = null

      moveFileAsync = ( path, back )->
        new Promise ( resolve, reject )->
          mvAsync path, back
          .then ( res )->
            resolve res
          .catch ( error )->
            if error.code is 'ENOENT'
              return resolve 'no existing file to copy'
            reject error

      # First create a temp file to write to
      tmp.fileAsync()
      .then ( path, fd, cleanup_cb )->
        debug 'Tmp file save path fd cb', path, fd, cleanup_cb
        # .spread allows an array of arguments to be passed into this function
        tmp_path = path
        tmp_cleanup_cb = cleanup_cb

        # Now write the tmp yaml file, create a backup
        logger.info 'Writing yaml document to [%s]', tmp_path
        fs.writeFileAsync tmp_path, doc

      .then ( res )->
        debug 'save_yaml: after tmp write', res
        fs.statAsync yaml_path
      .then ( stat )->

        # Backup the current file
        datestamp = moment().format("YYYYMMDD-hhmmss")
        backup_file = "#{yaml_path}.#{datestamp}"

        logger.info 'Creating backup yaml document [%s]', backup_file
        
        moveFileAsync yaml_path, backup_file

      .then ( res )->
        debug 'save_yaml: yaml renamed to backup', res

        # Put the new file into place
        logger.info 'Moving yaml document to [%s]', tmp_path
        mvAsync tmp_path, yaml_path

      .then ( res )->
        debug 'save_yaml: temp yaml renamed to real', res
        logger.info "YAML rules file written [#{yaml_path}]"
        self.edited = false
        resolve()

      .catch ( error )->
        logger.error "Error saving yaml file [%s]", error, error.stack
        debug 'save_yaml running temp cleanup after error'
        reject( error )
      
    .finally ->
      # decrement the lock
      self.saving_counter -=1
      debug 'finally save_yaml_async', self.saving_counter

      # Reload from file
      #@constructor.load @path


  # ###### save_yaml_git_async()
  # Save event rules back to the yaml file and commit to git
  # instead of saving a backup file.
  save_yaml_git_async: ( yaml_path = @path, opts = {} )->
    self = @
    new Promise ( resolve, reject )->

      # increment lock and test
      self.saving_counter +=1
      debug 'saving_counter = ', self.saving_counter
      unless self.saving_counter == 1
        return reject( "rules are being saved by someone else" )

      # Gen our rules yaml
      doc = self.to_yaml()
      debug 'save_yaml_git generated a yaml doc', "\n" + doc

      # Setup git paths
      path_repo = path.dirname(yaml_path)
      yaml_filename = path.basename(yaml_path)
      logger.info 'Writing yaml document to git [%s] [%s]', yaml_path, path_repo

      # Place to store the repo ref
      repo = Promise.promisifyAll git(path_repo)
      repo_index = null
      
      fs.writeFileAsync yaml_path, doc
      .then ( res )->
        debug 'save_yaml_git: yaml written to file', yaml_path
        logger.info "YAML rules file written [#{yaml_path}]"
        self.edited = false
        repo.addAsync yaml_filename
      .then ( res )->
        debug 'save_yaml_git: yaml_filename added to git [%s] [%s]', res, yaml_filename

        commit_msg = "Rules UI deploy - #{opts.user_name}"
        if self.have_edited_msgs()
          commit_msg += "\n" + self.edit_msgs.join '\n'
          self.edit_msgs = []

        self.git_commit_Async repo, commit_msg,
          all: true
          author: "#{opts.user_name} <#{opts.user_email}>"
      .then ( res )->
        debug 'save_yaml_git: git commit res', res
        ret = if opts.git_push
          repo.remote_pushAsync 'origin', 'master'
        else
          false
      .then ( res )->
        debug 'save_yaml_git: push res or false', res
        resolve(res)

      .catch ( error, out, err )->
        logger.error "Error saving yaml file to git[%s]", error, error.stack
        logger.error "stdout", error.stdout
        logger.error "stderr", error.stderr
        debug 'error', out, err
        reject( error )
    .finally ->
      # decrement the lock
      debug 'decrementing counter', self.saving_counter
      self.saving_counter -=1

  # `git_commit_Async`
  # Create a function so we can capture stdout and stderr on
  # the error message.
  git_commit_Async: ( repo, msg, opts = {} )->
    new Promise (resolve,reject)->
      repo.commit msg, opts, ( error, stdout, stderr )->
        if error
          error.stdout = stdout
          error.stederr = stderr
          reject error
        resolve stdout

  groups_array: ->
    @groups.store_order

  has_group: ( group )->
    @groups.has_group group


  # This was an attempt to expose a single interface via EventRules
  # to all the underlying modules. This means the public API to
  # would all be via EventRules,  but this might grow way too big
  action_names: ->
    _.keys Action.types

  select_names: ->
    _.keys Select.types

  option_names: ->
    _.keys Option.types

  find: ( ids )->
    self = @
    r = []

    _.forEach ids, (id)->
      if self.groups 
        r = _.flatten self.groups.find id
    r

  # Generate all the data from the yaml definitions
  # Agent
  # Globals
  # Groups
  # Schedules
  generate_rules: ->

    #global_discard
    #global_dedupe
    @schedules = Schedules.generate @doc.schedules, @

    # Agent specifics
    @agent = Agents.generate @doc.agent, @

    # Globals
    unless @doc.globals?
      throw_error 'definition missing globals'
    
    @globals = RuleSet.generate @doc.globals, @
    
    debug 'generate rules setup globals', @globals

    # Groups
    unless @doc.groups?
      throw_error 'definition missing groups'

    @groups = Groups.generate @doc.groups, @

    debug 'generate rules has setup groups', @groups.store_order


    # Return the document
    @doc

  # Generate all the data from the yaml definitions
  # Server
  generate_rules_server: ->
    # Schedules
    # must be parsed first as they are refrenced after

    @schedules = Schedules.generate @doc.schedules, @

    # Globals

    if @doc.agent
      @agent = Agents.generate @doc.agent

    unless @doc.globals?
      throw_error 'Rule yaml definition is missing `globals`'
    
    @globals = RuleSet.generate @doc.globals, @
    # TODO 
    debug 'generate rules setup globals', @globals

    # Groups
    unless @doc.groups?
      throw_error 'Rule yaml definition is missing `groups`'

    @groups = Groups.generate @doc.groups, @
    
    debug 'generate rules has setup groups', @groups.store_order


    @doc

  # Generate all the data from the yaml definitions
  # Agent
  generate_rules_agent: ->
    unless @doc.agent
      throw_error 'Rule yaml definition is missing `agent`'
    @agent = Agents.generate @doc.agent, @
    @doc



  # FIXME time to replace the @Identifier with a hash
  # current thinking is google's Farmhash
  
  # ###### `run( event )`

  # The main entry point for events.
  # A json event goes into the rules
  # A copy of the event, possibly modified
  #  comes out after rules processing
  # options{ tracking_matches: true|false }
  run: (event_obj, options = {}) ->
    self = @
    unless event_obj instanceof Event
      # Create a rule Event with some extras
      event_obj = Event.generate event_obj

    if options.tracking_matches
      event_obj.set_tracking options.tracking_matches

    debug 'starting rules procesing for event', event_obj.original
    ts_start = Date.now()

    # Sync
    # apply global rules first
    if self.globals
      self.globals.run event_obj
      # close off any global match tracking
      event_obj.close_matched_global()
    # apply group rules
    if self.groups
      self.groups.run event_obj
      
    # finally set identifier
    if self.globals or self.groups
      gl = if self.globals then "true" else "false"
      gr = if self.groups then "true" else "false"
      debug 'setting identifier GL=%s, GR=%s', gl, gr
      event_obj.populate_identifier()
    else
      event_obj.populate_pre_identifier()

    ts_total = Date.now() - ts_start
    debug 'rule processing took %s ms', ts_total
    # # Promised
    # self.globals.run event_obj
    # .then (event_obj) ->
    #   self.groups.run event_obj
    # #.then (event_obj) ->
    #   #self.globals_post.run event_obj
    # .catch (err) ->
    #   console.error 'Error', err, err.stack
    #   throw_error err

    #event_obj

    # A `EventRule.{id}` event will be fired when the rule
    # processing is complete. It will contain the event_obj
    
    return event_obj


  # ###### `agent_map( input_message )`

  # Sends a raw input message through the agent mappings so
  # we have all the fields right for the rules to start
  agent_map: ( input_message, event_obj = {} ) ->
    self = @

    # Create a rule Event with some extras
    unless event_obj instanceof Event
      event_obj = Event.generate event_obj

    event_obj.set_input_object input_message

    @agent.run event_obj

    return event_obj


  # ###### `rules( new_object, input_message_object )`

  # This is the event console *monitors* entry point.
  # Keeping it with the same signature for the moment
  rules: ( new_object, input_message )->
    event_obj = @agent_map input_message, new_object
    processed = @run event_obj
    
    # monitors expect the incoming object to be modified
    _.assign new_object, processed.copy
    
    # Dump the simple js object back out to the rules processing
    new_object

