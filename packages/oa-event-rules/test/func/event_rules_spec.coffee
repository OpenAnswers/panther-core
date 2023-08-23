
debug   = require( 'debug' )( 'oa:test:func:rules' )
{ expect
  fs
  copyFileAsync
  mkdir_if_missing_Async
  git_remote_add_Async  
  Promise
  escape_shell } = require '../mocha_helpers'

# npm modules
path = require 'path'
git = Promise.promisifyAll require('gift')

# Test setup
{EventRules} = require '../../lib/event_rules'





# And the tests

describe 'EventRules', ->

  # vars for all tests
  yaml_file = 'event_rules_spec.yml'
  path_test_fixture = path.join __dirname, 'fixture'
  yaml_load_path = path.join path_test_fixture, "#{yaml_file}.load"
  yaml_src_path = path.join path_test_fixture, "_original_#{yaml_file}"
  yaml_test_path = path.join path_test_fixture, "#{yaml_file}.saved"
  rules_yml_ori = undefined

  rules = null

  afterEach ->
    rules.stop_rules_watch()


  describe 'file save/backup', ->

    # Copy the _original fixture files into place for tests
    before ->
      copyFileAsync( yaml_src_path, yaml_test_path )
      .then (res)->
        debug 'copy res', res, yaml_src_path, yaml_load_path
        copyFileAsync( yaml_src_path, yaml_load_path )
      .then (res)->
        debug 'copy res', res
        #done()
      #.catch (err)->
      #  debug 'before: ', err
        #done(err)

    it 'saves event_rules in the same format as the original file', ->
      debug "new rules..."
      rules = new EventRules
        path: yaml_load_path

      debug 'rules in json', rules.to_yaml_obj()
      rules_yml_ori = rules.to_yaml_obj()

      rules.save_yaml_async( yaml_test_path )
      .then ->
        rules = new EventRules
          path: yaml_test_path

        debug 'globals', yaml_test_path, rules.globals.to_yaml_obj()
        expect( rules.agent.to_yaml_obj() ).to.eql rules_yml_ori.agent
        expect( rules.groups.to_yaml_obj() ).to.eql rules_yml_ori.groups
        expect( rules.globals.to_yaml_obj() ).to.eql rules_yml_ori.globals.rules

      .catch ( error )->
        console.error error

    it 'gets an event back out of saved rules', ->
      rules = new EventRules
        path: yaml_test_path

      obj = {}
      input = { node: 'node', severity: 4, summary: 'true test', test: true }
      rules.rules obj, input

      #expect( obj.test ).to.eql true
      #expect( obj.identifier ).to.eql 'node:4:true test'
      expect( obj.identifier ).to.eql '13085782457136753027'


    describe 'can pick up a rule change on disk', ->

      rules_change = null

      before ->
        rules_change = new EventRules
          path: yaml_test_path
        
        rules_yml_ori = rules.to_yaml_obj()

        yaml_changes_path = path.join __dirname, 'fixture', "_changes_#{yaml_file}"

        copyFileAsync( yaml_changes_path, yaml_test_path )
        .delay(1500)


      describe 'and the agent object matches', ->

        agent_yaml = null

        before ->
          agent_yaml = rules_change.agent.to_yaml_obj()
          debug 'agent_yaml', agent_yaml

        it 'should have a different agent object', ->
          expect( agent_yaml ).to.not.eql rules_yml_ori.agent

        it 'should have empty agent rules', ->
          expect( agent_yaml.rules ).to.exist
          expect( agent_yaml.rules ).to.eql []

        it 'should have severity maps of 5', ->
          expect( agent_yaml.severity_map ).to.exist
          expect( agent_yaml.severity_map["7"] ).to.eql 5


      describe 'and the groups object matches', ->

        groups_yaml = null

        before ->
          groups_yaml = rules_change.groups.to_yaml_obj()
          debug 'groups_yaml', groups_yaml

        it 'has a different groups object', ->
          expect( groups_yaml ).to.not.eql rules_yml_ori.groups

        it 'doesn\'t have the selec_c group', ->
          expect( groups_yaml.selec_c ).to.not.exist

        it 'should have a new group_a rule match', ->
          expect( groups_yaml.group_a ).to.exist
          ga = groups_yaml.group_a
          expect( ga.rules ).to.exist
          expect( ga.rules[0]).to.exist
          expect( ga.rules[0].match ).to.exist
          expect( ga.rules[0].match.summary ).to.exist
          expect( ga.rules[0].match.summary ).to.eql 'blarg new changes summary'


      describe 'and the globals object matches', ->

        globals_yaml = null

        before ->
          globals_yaml = rules_change.globals.to_yaml_obj()
          debug 'globals_yaml', globals_yaml

        it 'has a different globals object', ->
          expect( globals_yaml ).to.not.eql rules_yml_ori.globals



  describe 'git commit', ->

    path_yaml_repo = path.join path_test_fixture, 're po'
    path_yaml_repo_escaped = escape_shell(yaml_load_path)
    repo = null

    # Copy the _original fixture files into place for tests
    before ->

      yaml_load_path = path.join path_yaml_repo, "#{yaml_file}.load"
      yaml_test_path = path.join path_yaml_repo, "#{yaml_file}.saved"
      repo = null

      mkdir_if_missing_Async( path_yaml_repo )
      .then ->
        debug 'dir created'
        git.initAsync( path_yaml_repo )
      .then ->
        debug 'git inited'
        repo = Promise.promisifyAll git(path_yaml_repo)
      .then ->
        debug 'got repo'
        copyFileAsync( yaml_src_path, yaml_test_path )
      .then ->
        debug 'copied yaml_test_path'
        copyFileAsync( yaml_src_path, yaml_load_path )
      .then ->
        debug 'copied yaml_load_path'
        repo.addAsync '.'
      .then ->
        debug 'git add .'
        repo.commitAsync( 'initial func test setup' )
      .then ->
        debug 'committed'

    it 'event_rules in the same format as the original file', ->
      rules = new EventRules
        path: yaml_load_path

      debug 'rules in json', rules.to_yaml_obj()
      rules_yml_ori = rules.to_yaml_obj()

      rules.save_yaml_git_async yaml_test_path,
        user_name: 'test_user'
        user_email: 'support+panthertest@openanswers.co.uk'
      .then ->
        rules = new EventRules
          path: yaml_test_path

        debug 'globals', yaml_test_path, rules.globals.to_yaml_obj()
        expect( rules.agent.to_yaml_obj() ).to.eql rules_yml_ori.agent
        expect( rules.groups.to_yaml_obj() ).to.eql rules_yml_ori.groups
        expect( rules.globals.to_yaml_obj() ).to.eql rules_yml_ori.globals.rules



  describe 'git commit and push', ->

    path_yaml_repo_remote = path.join path_test_fixture, 'repo_remote'
    repo = null

    before ->

      yaml_load_path = path.join path_yaml_repo_remote, "#{yaml_file}.load"
      yaml_test_path = path.join path_yaml_repo_remote, "#{yaml_file}.saved"
      

      # This is to setup the git repos for testing. 

      # It can't deal with partial failures, if it gets into a state
      # `rm -rf test/func/fixture/re*` and let it start again

      # Create a repo to push to, if the directory doesn't exist
      # Create a repo to push from, if the directory doesn't exist
      # Add the remote
      # Commit the initial files
      mkdir_if_missing_Async( "#{path_yaml_repo_remote}_push" )
      .then ( res )->
        debug 'make repo push dir', res
        git.initAsync( "#{path_yaml_repo_remote}_push", true )
      .then ( res )->
        debug 'git init push repo', res
        mkdir_if_missing_Async( path_yaml_repo_remote )
      .then ( res )->
        debug 'make repo dir', res
        if res is 'exists'
          err = new Error('finish')
          err.finish = true
          throw err
        git.initAsync( path_yaml_repo_remote )
      .then ( res )->
        debug 'git init repo', res
        repo = Promise.promisifyAll git(path_yaml_repo_remote)
        repo.remote_addAsync 'origin', "../repo_remote_push"
      .then ( res )->
        debug 'git remote add', res
        copyFileAsync( yaml_src_path, yaml_test_path )
      .then ->
        debug 'copy yaml_test_path'
        copyFileAsync( yaml_src_path, yaml_load_path )
      .then ->
        debug 'copy yaml_load_path'
        repo.addAsync '.'
      .then ->
        debug 'git add'
        repo.commitAsync 'initial func test setup'
      .then ->
        debug 'git commit'
      .catch {finish:true}, (err)->
        debug 'repo dir already existed'


    it 'event_rules in the same format as the original', ->
      rules = new EventRules
        path: yaml_load_path

      debug 'rules in json', rules.to_yaml_obj()
      rules_yml_ori = rules.to_yaml_obj()

      rules.save_yaml_git_async yaml_test_path,
        user_name: 'test_user_push'
        user_email: 'support+panthertest@openanswers.co.uk'
        git_push: true
      .then ->
        rules = new EventRules
          path: yaml_test_path

        debug 'globals', yaml_test_path, rules.globals.to_yaml_obj()
        expect( rules.agent.to_yaml_obj() ).to.eql rules_yml_ori.agent
        expect( rules.groups.to_yaml_obj() ).to.eql rules_yml_ori.groups
        expect( rules.globals.to_yaml_obj() ).to.eql rules_yml_ori.globals.rules

      .catch ( error )->
        console.error error
        throw error