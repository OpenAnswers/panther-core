mocha   = require 'mocha'
expect  = require( 'chai' ).expect

{
  delay
  merge
  tap
  ensure_array
  regex_escape
  throw_error
  under_to_class
  class_to_under
  ends_with
  starts_with
  format_string
  format_string_object
  _
  map_object
  map_objects
  map_clone_object
  map_clone_objects
  random_string
  crypto_random_hex
  crypto_random_base64
  crypto_random_base64_url
  crypto_random_base62_string
  crypto_random_base62_string_async
  base62_from_base64
  regex_from_array
  is_numeric
  is_stringy
  is_regexy
  regexy_to_regex
  regexy_to_string
  array_replace
} = require '../src/helpers'



describe 'Helpers', ->


  describe '.delay', ->

    it 'runs', (done) ->
      delay 100, done


  describe '.ensure_array', ->

    it 'runs', (done) ->
      ensure_array 'test'
      done()


  describe '.regex_escape', ->

    it 'runs', (done) ->
      expect( regex_escape '\\\\' ).to.eql '\\\\\\\\'
      done()


  describe '.throw_error', ->

    xit 'runs', (done) ->
      fn = ->
        throw_error 'test'
      expect( fn ).to.throw( 'test')
      done()


  describe '.regex_from_array', ->

    it 'runs', (done) ->
      expect( regex_from_array( [] ) ).to.not.throw
      done()

    it 'turns simple array into regex', (done) ->
      expect( regex_from_array( ['test'] ) ).to.be.an.instanceof RegExp
      done()

    it 'turns simple regex into regex', (done) ->
      expect( regex_from_array( [/re\dex/] ) ).to.be.an.instanceof RegExp
      done()

    it 'turns simple stregex into regex', (done) ->
      re = regex_from_array ['/test/']
      expect( re ).to.be.an.instanceof RegExp
      expect( re.source ).to.equal 'test'
      done()



  describe '.under_to_class', ->

    it 'converts single word', (done) ->
      expect( under_to_class 'test' ).to.equal 'Test'
      done()

    it 'converts a double word', (done) ->
      expect( under_to_class 'test_next' ).to.equal 'TestNext'
      done()


  describe '.class_to_under', ->

    it 'converts single word', (done) ->
      expect( class_to_under 'Test' ).to.equal 'test'
      done()

    it 'converts a double word', (done) ->
      expect( class_to_under 'TestNext' ).to.equal 'test_next'
      done()


  describe '_', ->
   
    it 'can run an lodash function', (done) ->
      expect( _.keys a:2, b:4 ).to.eql [ 'a', 'b' ]
      done()


  describe '.map_object', ->
   
    obj =
      one: 1
      two: 2

    map =
      one: 'three'
      two: 'four'

    it 'has the function', (done)->
      expect( map_object ).to.be.instanceof Function
      done()

    it 'can run the function', (done)->
      expect( map_object obj, map ).to.not.throw.error
      done()

    it 'move values to new names', (done) ->
      expect( obj.three ).to.eql 1
      expect( obj.four ).to.eql 2
      done()

    it 'removes old values', (done) ->
      expect( obj.one ).to.not.exist
      expect( obj.two ).to.not.exist
      done()



  describe '.map_objects', ->

    objs = [{
      one: 1
      two: 2
    },{
      one: 3
      two: 4
    }]

    map =
      one: 'three'
      two: 'four'

    it 'has the function', (done)->
      expect( map_objects ).to.be.instanceof Function
      done()

    it 'can run the function', (done)->
      expect( map_objects objs, map ).to.not.throw.error
      done()

    it 'moves values to new names', (done) ->
      expect( objs[0].three ).to.eql 1
      expect( objs[0].four ).to.eql 2
      expect( objs[1].three ).to.eql 3
      expect( objs[1].four ).to.eql 4
      done()

    it 'removes old values', (done) ->
      expect( objs[0].one ).to.not.exist
      expect( objs[0].two ).to.not.exist
      expect( objs[1].one ).to.not.exist
      expect( objs[1].two ).to.not.exist
      done()


  describe '.ends_with', ->

    it 'works', ->
      expect( ends_with 'test', 'st' ).to.equal true

    it 'fails', ->
      expect( ends_with 'test', 'te' ).to.equal false


  describe '.starts_with', ->

    it 'works', ->
      expect( starts_with 'test', 'te' ).to.equal true

    it 'fails', ->
      expect( starts_with 'test', 'st' ).to.equal false


  # ###### format_string( string, variables )
  # Take a string like {whatever} and replace with the
  # variable { whatver: 'value' }
  #
  # Implementation of stacks string formatter
  # http://stackoverflow.com/a/23087471/1318694
  #
  #     format_string( 'wha{wha}wha', { wha: 2 } );
  #     // => wha2wha
  describe '.format_string', ->
    
    it 'formats a single var', ( done )->
      str = format_string( '{test}', { test: 'one'} )
      expect( str ).to.equal 'one'
      done()

    it 'formats a more complex string', ( done )->
      fmt = '1{test}{two} {three}5a'
      vars = { test: 'one', two: '222', three: 'tt'}
      str = format_string( fmt, vars )
      expect( str ).to.equal '1one222 tt5a'
      done()

    it 'returns stringified for nested objects', ( done )->
      fmt = '2{nested} {one}5a'
      vars = { 'one': '1', nested: { two: '222' }, three: 'tt'}
      str = format_string( fmt, vars )
      expect( str ).to.equal '2{"two":"222"} 15a'
      done()


  describe '.format_string_object', ->
    
    it 'formats a single var from an object', ->
      str = format_string_object( '{test}', { test: 'one'} )
      expect( str ).to.equal 'one'

    it 'formats a single var that\'s last', ->
      str = format_string_object( 'a{test}', { test: 'one'} )
      expect( str ).to.equal 'aone'

    it 'formats a single var that\'s first', ->
      str = format_string_object( '{test}a', { test: 'one'} )
      expect( str ).to.equal 'onea'

    it 'formats two vars', ->
      str = format_string_object( '{a}{b}', { a: '1', b: '2'} )
      expect( str ).to.equal '12'

    it 'formats two vars with last missing', ->
      str = format_string_object( '{a}{b}', { a: '1' } )
      expect( str ).to.equal '1{b}'

    it 'formats two vars with first missing', ->
      str = format_string_object( '{a}{b}', { b: '2' } )
      expect( str ).to.equal '{a}2'

    it 'formats two vars with a zero length string', ->
      str = format_string_object( '{none}{b}', { none: '', b: '2'} )
      expect( str ).to.equal '2'

    it 'formats a more complex string', ->
      fmt = '1{test}{two} {three}'
      vars = { test: 'one', two: '222', three: 'tt'}
      str = format_string_object( fmt, vars )
      expect( str ).to.equal '1one222 tt'

    it 'formats a string with a deep property', ->
      fmt = '1{test.two}a'
      vars = test: two: '222'
      str = format_string_object( fmt, vars )
      expect( str ).to.equal '1222a'

    it 'formats a string with a long deep property', ->
      fmt = '1{test.tworeallylongkey}'
      vars = test: tworeallylongkey: '222'
      str = format_string_object( fmt, vars )
      expect( str ).to.equal '1222'

    it 'ignores an open parenthesi', ->
      fmt = '1{test.twoa'
      vars =  test: twoa: 'aaaa'
      str = format_string_object( fmt, vars )
      expect( str ).to.equal '1{test.twoa'

    it 'formats a real string', ->
      fmt = '{user} assigned {metadata.ids} to {metadata.owner}'
      vars =
        user: 'meee'
        metadata:
          ids: '234234'
          owner: 'yooou'
      str = format_string_object( fmt, vars )
      expect( str ).to.equal 'meee assigned 234234 to yooou'

  describe '.map_clone_object', ->
    obj =
      one: 1
      two: 2
    map =
      one: 'three'
      two: 'four'

    it 'can run the function', (done)->
      expect( map_clone_object obj, map ).to.not.throw.error
      done()

    it 'maps a value', (done)->
      expect( map_clone_object obj, map ).to.have.property 'three'
      done()

    # it 'works on an object', (done)->
    #   obj_objs =
    #     first:
    #       one: 1
    #       two: 2
    #     second:
    #       one: 3
    #       two: 4
    #   expect( map_objects obj_objs, map ).to.not.throw.error
    #   expect( obj_objs.first ).to.exist
    #   expect( obj_objs.first.three ).to.exist
    #   expect( obj_objs.first.three ).to.eql 1
    #   expect( obj_objs.first.four ).to.eql 2
    #   expect( obj_objs.second.three ).to.eql 3
    #   expect( obj_objs.second.four ).to.eql 4


  describe '.is_numeric', ->

    it 'can run the function', (done)->
      expect( is_numeric(1) ).to.not.throw.error
      done()

    it 'works for a val', (done) ->
      expect( is_numeric 5 ).to.equal true
      done()

    it 'fails for a string', (done)->
      expect( is_numeric 'testing' ).to.equal false
      done()

    it 'fails for ""', (done)->
      expect( is_numeric '' ).to.equal false
      done()


  describe '.is_regexy', ->

    it 'can run the function', (done)->
      expect( is_regexy("/r/") ).to.not.throw.error
      done()

    it 'works', (done)->
      expect( is_regexy "/test/" ).to.equal true
      done()

    it 'works with a trailing /i', (done)->
      expect( is_regexy "/test/i" ).to.equal true
      done()

    it 'works with a trailing /m', (done)->
      expect( is_regexy "/test/m" ).to.equal true
      done()

    it 'works with a trailing /g', (done)->
      expect( is_regexy "/test/g" ).to.equal true
      done()

    it 'works with a trailing /img', (done)->
      expect( is_regexy "/test/img" ).to.equal true
      done()

    it 'fails for unknown trailing', (done)->
      expect( is_regexy "/other/C" ).to.equal false
      done()

    it 'fails for trailing slash', (done)->
      expect( is_regexy "other/" ).to.equal false
      done()

    it 'fails for leading slash', (done)->
      expect( is_regexy "/other" ).to.equal false
      done()

  describe '.is_stringy', ->

    it 'can run the function', (done)->
      expect( is_stringy('"t"') ).to.not.throw.error
      done()

    it 'works doubles', (done)->
      expect( is_stringy '"5"' ).to.equal true
      done()

    it 'works singles', (done)->
      expect( is_stringy "'5'" ).to.equal true
      done()

    it 'fails', (done)->
      expect( is_stringy "other/" ).to.equal false
      done()


  describe '.regexy_to_string', ->

    it 'can run the function', (done)->
      expect( regexy_to_string('//') ).to.not.throw.error
      done()

    it 'works on "/test/"', (done)->
      expect( regexy_to_string('/test/') ).to.eql 'test'
      done()

    it 'fails on re', (done)->
      fn = ->
        regexy_to_regex /re/
      expect( fn ).to.throw Error, /Regexy match failed for/
      done()


  describe '.regexy_to_regex', ->

    it 'can run the function', (done)->
      expect( regexy_to_regex('//') ).to.not.throw.error
      done()

    it 'will throw on invalid input', (done)->
      fn = ->
        regexy_to_regex '/\(.*/'
      expect( fn ).to.throw SyntaxError, /Invalid regular expression/
      done()

    it 'works on "/test/"', (done)->
      expect( regexy_to_regex('/test/') ).to.eql /test/
      done()

    it 'works on "/test/i"', (done)->
      expect( regexy_to_regex('/test/i') ).to.eql /test/i
      done()

    it 'works on "/test/m"', (done)->
      expect( regexy_to_regex('/test/m') ).to.eql /test/m
      done()

    it 'fails on "test"', (done)->
      fn = ->
        regexy_to_regex /re/
      expect( fn ).to.throw Error, /Regexy match failed for/
      done()


  describe '.array_replace', ->

    xit 'can run the function', (done)->
      expect( array_replace() ).to.not.throw.error
      done()

    xit 'works', (done)->
      start = [ 5, 6 ]
      expect( array_replace start, 7, 6 ).to.eql [ 5,7 ]
      done()


  describe '.random_string', ->

    it 'generates a string of length 12', ( done )->
      expect( random_string(12).length ).to.equal 12
      done()

    it 'generates only chars', ( done )->
      rnd = random_string(12)
      expect( rnd.length ).to.equal 12
      expect( rnd ).to.match /^[A-Za-z0-9]+$/
      done()


  describe '.crypto_random_base62', ->
   
    it 'generates a string of length 12', ( done )->
      expect( crypto_random_base62_string(12).length ).to.equal 12
      done()

    it 'generates a string of length 13', ( done )->
      expect( crypto_random_base62_string(13).length ).to.equal 13
      done()

    it 'generates a string of length 14', ( done )->
      expect( crypto_random_base62_string(14).length ).to.equal 14
      done()

    it 'generates only chars', ( done )->
      rnd = crypto_random_base62_string(13)
      expect( rnd.length ).to.equal 13
      expect( rnd ).to.match /^[A-Za-z0-9]+$/
      done()


  describe '.crypto_random_base64', ->

    it 'generates a string of length 12 for 9 bytes', ( done )->
      result = crypto_random_base64(9)
      expect( result ).to.have.keys 'string', 'bytes'
      expect( result.bytes ).to.be.an.instanceof Buffer
      expect( result.string.length ).to.equal 12
      done()


  describe '.crypto_random_hex', ->

    it 'generates a string of length 12 for 9 bytes', ( done )->
      result = crypto_random_hex(6)
      expect( result ).to.have.keys 'string', 'bytes'
      expect( result.bytes ).to.be.an.instanceof Buffer
      expect( result.string.length ).to.equal 12
      done()

