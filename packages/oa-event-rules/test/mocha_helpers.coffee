
mocha   = require 'mocha'
expect  = require( 'chai' ).expect
sinon   = require 'sinon'
{_}     = require 'oa-helpers'
Promise = require 'bluebird'
fs      = require 'node:fs'
{ stat, mkdir } = require 'node:fs/promises'

debug = require( 'debug' )( 'oa:test:helpers' )

# Set 'test' so logging goes away
process.env.NODE_ENV = 'test'

# Source maps for development
require('source-map-support').install()

# I guess this is esentially a mock for a RuleSet
rules_runner = ( ev, rules ) ->
  ev_processed = ev
  for rule in rules
    ev_processed = rule.run ev_processed
  ev_processed

mkdir_if_missing_Async = ( dir )->
  stat dir
  .then (res)->
    debug 'stat dir res', dir, res
    'exists'
  .catch (error)-> 
    if error.code is 'ENOENT'
      debug "MKDIRing"
      mkdir dir

git_remote_add_Async = ( repo, name, url )->
  repo.remote_addAsync( name, url )
  .then repo.remote_fetch( name )

copyFileAsync = ( path, new_path ) ->
  new Promise ( resolve, reject )->
    r = fs.createReadStream(path)
    w = fs.createWriteStream(new_path)
    r.pipe w

    w.on 'finish', ->
      resolve(true)

    w.on 'error', (error)->
      reject(error)

escape_shell = ( cmd )->
  "#{cmd.replace(/(["\s'$`\\])/g,'\\$1')}"

event_samples =

  simple:
    identifier: 'qweiru42:3:simple alert summary of sev 3'
    node:       'qweiru42'
    severity:   3
    summary:    'simple alert summary of sev 3'

  middle:
    identifier: 'azeiru34:4:middle summary sev 4'
    node:       'azeiru34'
    severity:   4
    summary:    'middle summary sev 4'
    agent:      'sample'

  complex:
    identifier: 'rbeiru93:5:complex summary sev 5'
    node:       'rbeiru93'
    severity:   5
    summary:    'complex summary sev 5'
    agent:      'syslog'



module.exports =
  mocha:    mocha
  expect:   expect
  sinon:    sinon
  debug:    debug
  _:        _
  event_samples:  event_samples
  rules_runner:   rules_runner
  fs: fs
  Promise: Promise
  git_remote_add_Async: git_remote_add_Async
  mkdir_if_missing_Async: mkdir_if_missing_Async
  copyFileAsync:  copyFileAsync
  escape_shell:   escape_shell
