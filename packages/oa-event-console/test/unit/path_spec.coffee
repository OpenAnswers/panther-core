debug   = require( 'debug' )( 'oa:test:unit:path' )
helpers = require '../mocha_helpers'
expect  = helpers.expect


# Test setup
Path = require('../../lib/path').Path
path = require 'path'

before (d) ->
  d()


describe 'Path', ->

  describe 'has the base properties', ->

    # This is very specific to the path the test file is in...
    base_path = Path.join __dirname, '..', '..', '/'

    # Shortcut for building the test paths
    base = (path_names...)->
      Path.join base_path, path_names...

    it '.base', ->
      expect( Path.base ).to.equal 

    it '.app', ->
      expect( Path.app ).to.equal base('app')

    it '.views', ->
      expect( Path.views ).to.equal  base('app','view')

    it '.public', ->
      expect( Path.public ).to.equal  base('public')

    it '.assets', ->
      expect( Path.assets ).to.equal  base('app','assets')

    it '.bower', ->
      expect( Path.bower ).to.equal  base('app','assets','bower')

    it '.bower_src', ->
      expect( Path.bower_src ).to.equal base('bower_components')


  describe 'provides join', ->

    it 'does a join', ->
      expect( Path.join 'a', 'b' ).to.equal path.join( 'a', 'b' )


  describe 'can add to the base properties', ->

    it 'adds a generic path', ->
      Path.add 'new', 'my/path'
      expect( Path.new ).to.equal 'my/path'

    it 'adds an app local path', ->
      Path.add_local 'newl', 'my/path'
      expect( Path.newl ).to.equal path.join __dirname, '..', '..', 'my/path'
