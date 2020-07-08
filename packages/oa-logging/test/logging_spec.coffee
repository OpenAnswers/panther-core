#
# Copyright (C) 2015, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.  
# This file is subject to the terms and conditions defined in the Software License Agreement.
# 


mocha   = require 'mocha'
expect  = require( 'chai' ).expect
sinon   = require 'sinon'


# Test setup for logs
winston     = require 'winston'
spy_logger  = require 'winston-spy'

lib_dir = "../lib/logging"

describe 'Logging', ->

  describe 'require', ->

    it 'creates a tagged logger', (done) ->
      {EventLogger,logger} = require(lib_dir)('oa:testcase1')
      expect( logger ).to.be.an.instanceof EventLogger
      done()


    describe 'logger', ->

      describe 'has methods', ->
        
        {EventLogger} = require(lib_dir)('oa:testcase1')
        logger = null

        beforeEach ->
          logger = new EventLogger winston

        it '.log', ->
          expect( typeof logger.log ).to.equal 'function'

        it '.silly', ->
          expect( typeof logger.silly ).to.equal 'function'

        it '.debug', ->
          expect( typeof logger.debug ).to.equal 'function'

        it '.info', ->
          expect( typeof logger.info ).to.equal 'function'

        it '.warn', ->
          expect( typeof logger.warn ).to.equal 'function'

        it '.error', ->
          expect( typeof logger.error ).to.equal 'function'


      describe 'logging', ->

        spy         = null
        logger      = null
        EventLogger = null

        # We use a spy logger to see what should have happened
        # Could achieve the same with an event attached to winston
        beforeEach (done) ->
          {EventLogger} = require(lib_dir)('oa:testcase2')
          spy = sinon.spy()
          spy_logger = new winston.Logger
            transports: [
              new winston.transports.SpyLogger spy: spy, level: 'debug'
            ]
          logger = new EventLogger spy_logger, 'test'
          
          done()

        it 'can run log directly', (done) ->
          logger.log 'info', 'can run log directly'
          expect( spy.calledOnce ).to.equal true
          expected_args = [['info', 'can run log directly', logger: 'test' ]]
          expect( spy.args ).to.eql expected_args
          done()

        it 'can call .error', (done) ->
          logger.error 'emsg'
          expect( spy.calledOnce ).to.equal true
          expect( spy.args ).to.eql( [[ 'error', 'emsg', logger: 'test' ]] )
          done()
  
        it 'can call the .error_id helper', ->
          id = logger.error_id 'eid msg'
          expect( spy.calledOnce ).to.equal true
          expect( id ).to.be.a.string
          expect( id ).to.have.lengthOf 8
          expect( spy.args ).to.eql( [[ 'error', 'eid msg', { error_id: id, logger: 'test' }]] )

        it 'can call .warn', (done) ->
          logger.warn 'wmsg'
          expect( spy.calledOnce ).to.equal true
          expect( spy.args ).to.eql( [[ 'warn', 'wmsg', logger: 'test' ]] )
          done()

        it 'can call .info', (done) ->
          logger.info 'imsg'
          expect( spy.calledOnce ).to.equal true
          expect( spy.args ).to.eql( [[ 'info', 'imsg', logger: 'test' ]] )
          done()

        it 'can call .debug', (done) ->
          logger.debug 'dmsg'
          expect( spy.calledOnce ).to.equal true
          expect( spy.args ).to.eql( [[ 'debug', 'dmsg', logger: 'test' ]] )
          done()

        it 'logs with formatting', ->
          logger.info 'test %s', 'test'
          expected_args = [[ 'info', 'test test', logger: 'test' ]]
          expect( spy.args ).to.eql expected_args

        it 'logs with more formatting', ->
          logger.info 'test %s %s', 1, 2
          expected_args = [[ 'info', 'test 1 2', logger: 'test' ]]
          expect( spy.args ).to.eql expected_args

        it 'adds 1 tag to metadata for sub loggers', ->
          new EventLogger( logger, 't2').info 'sub2msg'
          expected_args = [[ 'info', 'sub2msg', logger: ['test','t2'] ]]
          expect( spy.calledOnce ).to.equal true
          expect( spy.args ).to.eql expected_args

        it 'adds 2 tag to metadata for sub loggers', ->
          logger2 = new EventLogger logger, 't2'
          logger3 = new EventLogger logger2 , 't3'
          logger3.info 'sub3msg'
          expected_args = [[ 'info', 'sub3msg', logger: ['test','t2','t3'] ]]
          expect( spy.calledOnce ).to.equal true
          expect( spy.args ).to.eql expected_args

        it 'adds 3 tag to metadata for sub loggers', ->
          logger2 = new EventLogger logger, 't2'
          logger3 = new EventLogger logger2 , 't3'
          logger4 = new EventLogger logger3 , 't4'
          logger4.info 'sub3msg'
          expected_args = [[
            'info', 'sub3msg', logger: ['test','t2','t3','t4']
          ]]
          expect( spy.calledOnce ).to.equal true
          expect( spy.args ).to.eql expected_args

        it 'logs with metadata', ->
          logger.info 'test', { nope: 'blah'}
          expected_args = [[ 'info', 'test', nope: 'blah', logger: 'test' ]]
          expect( spy.args ).to.eql expected_args

        it 'logs with different metadata', ->
          logger.info 'test', { nother: 'item'}
          expected_args = [[ 'info', 'test', nother: 'item', logger: 'test' ]]
          expect( spy.args ).to.eql expected_args

        it 'ignores a supplied "logger" field in metadata', ->
          logger.info 'test', { logger: 'blah'}
          expected_args = [[ 'info', 'test', logger: 'test' ]]
          expect( spy.args ).to.eql expected_args


      describe 'levels', ->

        spy         = null
        logger      = null
        EventLogger = null

        # We use a spy logger to see what should have happened
        # Could achieve the same with an event attached to winston
        beforeEach (done) ->
          {EventLogger} = require(lib_dir)('oa:testcase2')
          spy = sinon.spy()
          spy_logger = new winston.Logger
            transports: [
              new winston.transports.SpyLogger spy: spy, level: 'info'
            ]
          logger = new EventLogger spy_logger, 'test'
          done()

        it 'cant call .debug', (done) ->
          logger.debug 'dmsg'
          expect( spy.calledOnce ).to.equal false
          expect( spy.args ).to.eql( [] )
          done()


      describe 'set levels', ->

        spy         = null
        logger      = null
        EventLogger = null

        # We use a spy logger to see what should have happened
        # Could achieve the same with an event attached to winston
        beforeEach (done) ->
          {EventLogger} = require(lib_dir)('oa:testcase2')
          spy = sinon.spy()
          spy_logger = new winston.Logger
            transports: [
              new winston.transports.SpyLogger spy: spy, level: 'debug'
            ]
          logger = new EventLogger spy_logger, 'test'
          
          done()

        it 'can call .debug', (done) ->
          logger.debug 'dmsg'
          expect( spy.calledOnce ).to.equal true
          expect( spy.args ).to.eql( [['debug','dmsg',logger: 'test']] )
          done()

        it 'cant call .debug', ( done )->
          logger.set_level 'info'
          logger.debug 'dmsg'
          expect( spy.calledOnce ).to.equal false
          expect( spy.args ).to.eql( [] )
          done()

        it 'can call .debug', ( done )->
          logger.set_level 'debug'
          logger.debug 'dmsg'
          expect( spy.calledOnce ).to.equal true
          expect( spy.args ).to.eql( [['debug','dmsg',logger: 'test']] )
          done()


      describe 'RequestLogger', ->

        {EventLogger,RequestLogger} = require(lib_dir)()

        spy = sinon.spy()
        spy_logger = new winston.Logger
          transports: [
            new winston.transports.SpyLogger spy: spy, level: 'debug'
          ]
        logger = new EventLogger spy_logger, 'oa:testcase3'

        request_logger_fn = RequestLogger.combined logger

        req =
          ip: 1
          httpVersionMajor: 1
          httpVersionMinor: 1
          headers:
            referrer: 'back/there'
        res =
          statusCode: 200

        it 'has middleware method', ->
          expect( request_logger_fn ).to.be.a 'function'

        it 'calls next from closure', ( done )->
          request_logger_fn req, res, done

        it 'has a socket logger', ->
          expect( RequestLogger.log_socket_combined ).to.be.a 'function'
      

      # These tests should remain last as they impact the default logger.
      # They test functionality in the require function that only affects
      # the default logger
      describe 'ENV settings modify the default logger', ->

        spy = null
        spy_transports = null
        spy_logger = null
 
        beforeEach ->
          spy = sinon.spy()
          spy_transports =
            level: 'warn'
            transports: [
              new winston.transports.SpyLogger spy: spy, level: 'debug'
            ]
          spy_logger = new winston.Logger spy_transports
        
        describe 'NODE_ENV=test', ->

          old_env = process.env.NODE_ENV
          process.env.NODE_ENV = "test"
          {logger} = require(lib_dir)('oa:test:logging:NODE_ENV',logger:spy_logger)
          logger.head.configure spy_transports

          it 'should not log info', ->
            logger.info 'whatever'
            expect( spy.calledOnce ).to.equal false

          xit 'should log warn', ->
            logger.warn 'whatever'
            expect( spy.calledOnce ).to.equal true


        describe 'NODE_TEST', ->

          old = process.env.NODE_TEST
          process.env.NODE_TEST = '1'
          {logger} = require(lib_dir)('oa:test:logging:NODE_TEST',logger:spy_logger)
          logger.head.configure spy_transports

          it 'should not log info', ->
            logger.info 'whatever'
            expect( spy.calledOnce ).to.equal false

          xit 'should log warn', ->
            logger.warn 'whatever'
            expect( spy.calledOnce ).to.equal true
   
