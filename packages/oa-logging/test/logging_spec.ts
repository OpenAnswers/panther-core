//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const expect = require('chai').expect;
const sinon = require('sinon');

// Test setup for logs
const winston = require('winston');
const spy_logger = require('winston-spy');

const lib_dir = '../lib/logging';

describe('Logging', function () {
  describe('require', function () {
    it('creates a tagged logger', function (done: Function) {
      const { EventLogger, logger } = require(lib_dir)('oa:testcase1');
      expect(logger).to.be.an.instanceof(EventLogger);
      done();
    });

    describe('logger', function () {
      describe('has methods', function () {
        const { EventLogger } = require(lib_dir)('oa:testcase1');
        let logger: any = null;

        beforeEach(function () {
          logger = new EventLogger(winston);
        });

        it('.log', function () {
          expect(typeof logger.log).to.equal('function');
        });

        it('.silly', function () {
          expect(typeof logger.silly).to.equal('function');
        });

        it('.debug', function () {
          expect(typeof logger.debug).to.equal('function');
        });

        it('.info', function () {
          expect(typeof logger.info).to.equal('function');
        });

        it('.warn', function () {
          expect(typeof logger.warn).to.equal('function');
        });

        it('.error', function () {
          expect(typeof logger.error).to.equal('function');
        });
      });

      describe('logging', function () {
        let spy: any = null;
        let logger: any = null;
        let EventLogger: any = null;

        // We use a spy logger to see what should have happened
        // Could achieve the same with an event attached to winston
        beforeEach(function (done: Function) {
          ({ EventLogger } = require(lib_dir)('oa:testcase2'));
          spy = sinon.spy();
          const spyLoggerInstance = new winston.Logger({
            transports: [new winston.transports.SpyLogger({ spy, level: 'debug' })],
          });
          logger = new EventLogger(spyLoggerInstance, 'test');
          done();
        });

        it('can run log directly', function (done: Function) {
          logger.log('info', 'can run log directly');
          expect(spy.calledOnce).to.equal(true);
          const expected_args = [['info', 'can run log directly', { logger: 'test' }]];
          expect(spy.args).to.eql(expected_args);
          done();
        });

        it('can call .error', function (done: Function) {
          logger.error('emsg');
          expect(spy.calledOnce).to.equal(true);
          expect(spy.args).to.eql([['error', 'emsg', { logger: 'test' }]]);
          done();
        });

        it('can call the .error_id helper', function () {
          const id = logger.error_id('eid msg');
          expect(spy.calledOnce).to.equal(true);
          expect(id).to.be.a('string');
          expect(id).to.have.lengthOf(8);
          expect(spy.args).to.eql([['error', 'eid msg', { error_id: id, logger: 'test' }]]);
        });

        it('can call .warn', function (done: Function) {
          logger.warn('wmsg');
          expect(spy.calledOnce).to.equal(true);
          expect(spy.args).to.eql([['warn', 'wmsg', { logger: 'test' }]]);
          done();
        });

        it('can call .info', function (done: Function) {
          logger.info('imsg');
          expect(spy.calledOnce).to.equal(true);
          expect(spy.args).to.eql([['info', 'imsg', { logger: 'test' }]]);
          done();
        });

        it('can call .debug', function (done: Function) {
          logger.debug('dmsg');
          expect(spy.calledOnce).to.equal(true);
          expect(spy.args).to.eql([['debug', 'dmsg', { logger: 'test' }]]);
          done();
        });

        it('logs with formatting', function () {
          logger.info('test %s', 'test');
          const expected_args = [['info', 'test test', { logger: 'test' }]];
          expect(spy.args).to.eql(expected_args);
        });

        it('logs with more formatting', function () {
          logger.info('test %s %s', 1, 2);
          const expected_args = [['info', 'test 1 2', { logger: 'test' }]];
          expect(spy.args).to.eql(expected_args);
        });

        it('adds 1 tag to metadata for sub loggers', function () {
          new EventLogger(logger, 't2').info('sub2msg');
          const expected_args = [['info', 'sub2msg', { logger: ['test', 't2'] }]];
          expect(spy.calledOnce).to.equal(true);
          expect(spy.args).to.eql(expected_args);
        });

        it('adds 2 tag to metadata for sub loggers', function () {
          const logger2 = new EventLogger(logger, 't2');
          const logger3 = new EventLogger(logger2, 't3');
          logger3.info('sub3msg');
          const expected_args = [['info', 'sub3msg', { logger: ['test', 't2', 't3'] }]];
          expect(spy.calledOnce).to.equal(true);
          expect(spy.args).to.eql(expected_args);
        });

        it('adds 3 tag to metadata for sub loggers', function () {
          const logger2 = new EventLogger(logger, 't2');
          const logger3 = new EventLogger(logger2, 't3');
          const logger4 = new EventLogger(logger3, 't4');
          logger4.info('sub3msg');
          const expected_args = [['info', 'sub3msg', { logger: ['test', 't2', 't3', 't4'] }]];
          expect(spy.calledOnce).to.equal(true);
          expect(spy.args).to.eql(expected_args);
        });

        it('logs with metadata', function () {
          logger.info('test', { nope: 'blah' });
          const expected_args = [['info', 'test', { nope: 'blah', logger: 'test' }]];
          expect(spy.args).to.eql(expected_args);
        });

        it('logs with different metadata', function () {
          logger.info('test', { nother: 'item' });
          const expected_args = [['info', 'test', { nother: 'item', logger: 'test' }]];
          expect(spy.args).to.eql(expected_args);
        });

        it('ignores a supplied "logger" field in metadata', function () {
          logger.info('test', { logger: 'blah' });
          const expected_args = [['info', 'test', { logger: 'test' }]];
          expect(spy.args).to.eql(expected_args);
        });
      });

      describe('levels', function () {
        let spy: any = null;
        let logger: any = null;
        let EventLogger: any = null;

        beforeEach(function (done: Function) {
          ({ EventLogger } = require(lib_dir)('oa:testcase2'));
          spy = sinon.spy();
          const spyLoggerInstance = new winston.Logger({
            transports: [new winston.transports.SpyLogger({ spy, level: 'info' })],
          });
          logger = new EventLogger(spyLoggerInstance, 'test');
          done();
        });

        it('cant call .debug', function (done: Function) {
          logger.debug('dmsg');
          expect(spy.calledOnce).to.equal(false);
          expect(spy.args).to.eql([]);
          done();
        });
      });

      describe('set levels', function () {
        let spy: any = null;
        let logger: any = null;
        let EventLogger: any = null;

        beforeEach(function (done: Function) {
          ({ EventLogger } = require(lib_dir)('oa:testcase2'));
          spy = sinon.spy();
          const spyLoggerInstance = new winston.Logger({
            transports: [new winston.transports.SpyLogger({ spy, level: 'debug' })],
          });
          logger = new EventLogger(spyLoggerInstance, 'test');
          done();
        });

        it('can call .debug', function (done: Function) {
          logger.debug('dmsg');
          expect(spy.calledOnce).to.equal(true);
          expect(spy.args).to.eql([['debug', 'dmsg', { logger: 'test' }]]);
          done();
        });

        it("cant call .debug after set_level('info')", function (done: Function) {
          logger.set_level('info');
          logger.debug('dmsg');
          expect(spy.calledOnce).to.equal(false);
          expect(spy.args).to.eql([]);
          done();
        });

        it("can call .debug after set_level('debug')", function (done: Function) {
          logger.set_level('debug');
          logger.debug('dmsg');
          expect(spy.calledOnce).to.equal(true);
          expect(spy.args).to.eql([['debug', 'dmsg', { logger: 'test' }]]);
          done();
        });
      });

      describe('RequestLogger', function () {
        const { EventLogger, RequestLogger } = require(lib_dir)();

        const spy = sinon.spy();
        const spyLoggerInstance = new winston.Logger({
          transports: [new winston.transports.SpyLogger({ spy, level: 'debug' })],
        });
        const logger = new EventLogger(spyLoggerInstance, 'oa:testcase3');

        const request_logger_fn = RequestLogger.combined(logger);

        const req = {
          ip: 1,
          httpVersionMajor: 1,
          httpVersionMinor: 1,
          headers: {
            referrer: 'back/there',
          },
        };
        const res = {
          statusCode: 200,
        };

        it('has middleware method', function () {
          expect(request_logger_fn).to.be.a('function');
        });

        it('calls next from closure', function (done: Function) {
          const next = sinon.spy(function () {
            expect(next.calledOnce).to.equal(true);
            done();
          });
          request_logger_fn(req, res, next);
        });

        it('has a socket logger', function () {
          expect(RequestLogger.log_socket_combined).to.be.a('function');
        });
      });

      // These tests should remain last as they impact the default logger.
      // They test functionality in the require function that only affects
      // the default logger
      describe('ENV settings modify the default logger', function () {
        let spy: any = null;
        let spy_transports: any = null;
        let spy_loggerInst: any = null;

        beforeEach(function () {
          spy = sinon.spy();
          spy_transports = {
            level: 'warn',
            transports: [new winston.transports.SpyLogger({ spy, level: 'debug' })],
          };
          spy_loggerInst = new winston.Logger(spy_transports);
        });

        describe('NODE_ENV=test', function () {
          const old_env = process.env.NODE_ENV;
          process.env.NODE_ENV = 'test';
          const { logger } = require(lib_dir)('oa:test:logging:NODE_ENV', { logger: spy_loggerInst });

          // Note: logger.head may not be available when spy_loggerInst is from beforeEach
          // This matches the original test structure

          it('should not log info', function () {
            logger.info('whatever');
            expect(spy.calledOnce).to.equal(false);
          });

          xit('should log warn', function () {
            logger.warn('whatever');
            expect(spy.calledOnce).to.equal(true);
          });
        });

        describe('NODE_TEST', function () {
          const old = process.env.NODE_TEST;
          process.env.NODE_TEST = '1';
          const { logger } = require(lib_dir)('oa:test:logging:NODE_TEST', { logger: spy_loggerInst });

          it('should not log info', function () {
            logger.info('whatever');
            expect(spy.calledOnce).to.equal(false);
          });

          xit('should log warn', function () {
            logger.warn('whatever');
            expect(spy.calledOnce).to.equal(true);
          });
        });
      });
    });
  });
});
