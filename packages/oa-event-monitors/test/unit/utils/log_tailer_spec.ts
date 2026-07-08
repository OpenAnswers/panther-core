//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

process.env.NODE_ENV = 'test';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { expect, sinon } = require('../../mocha_helpers');

const { LogTailer, LogTokenizer, ComplexLogTokenizer } = require('../../../lib/utils/log_tailer');

describe('Unit::EventMonitors::utils::LogTailer', function () {
  const created: string[] = [];

  function tmpLog(label: string) {
    const p = path.join(
      os.tmpdir(),
      `oamon-logtailer-${label}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.log`
    );
    fs.writeFileSync(p, '');
    created.push(p);
    return p;
  }

  after(function () {
    for (const p of created) {
      try {
        fs.unlinkSync(p);
      } catch {
        /* ignore */
      }
    }
  });

  describe('LogTailer base parse()', function () {
    it('invokes tokenCB with a MISSING PARSE message when not overridden', function () {
      const cb = sinon.spy();
      const t = new LogTailer({
        tokenCB: cb,
        logfilePath: tmpLog('base'),
      });

      t.parse('anything');

      expect(cb.calledOnce).to.equal(true);
      expect(cb.firstCall.args[0].msg).to.match(/MISSING PARSE/);
    });
  });

  describe('LogTokenizer', function () {
    it('splits the line on the configured separator and maps positions to field names', function () {
      const cb = sinon.spy();
      const t = new LogTokenizer({
        tokenCB: cb,
        logfilePath: tmpLog('tokz'),
        seperatorToken: ',',
        fieldMapping: { 0: 'timestamp', 1: 'host', 2: 'message' },
      });

      t.parse('2026-04-22T10:00:00Z,host-a,something happened');

      expect(cb.calledOnce).to.equal(true);
      expect(cb.firstCall.args[0]).to.deep.equal({
        timestamp: '2026-04-22T10:00:00Z',
        host: 'host-a',
        message: 'something happened',
      });
    });

    it('defaults to tab as the separator', function () {
      const cb = sinon.spy();
      const t = new LogTokenizer({
        tokenCB: cb,
        logfilePath: tmpLog('tab'),
        fieldMapping: { 0: 'a', 1: 'b' },
      });

      t.parse('foo\tbar');

      expect(cb.firstCall.args[0]).to.deep.equal({ a: 'foo', b: 'bar' });
    });

    it('drops unmapped positions without throwing', function () {
      const cb = sinon.spy();
      const t = new LogTokenizer({
        tokenCB: cb,
        logfilePath: tmpLog('drop'),
        seperatorToken: ',',
        fieldMapping: { 0: 'only' },
      });

      t.parse('first,second,third');

      expect(cb.firstCall.args[0]).to.deep.equal({ only: 'first' });
    });
  });

  describe('ComplexLogTokenizer', function () {
    it('accumulates lines and flushes on the record terminator', function () {
      const cb = sinon.spy();
      const t = new ComplexLogTokenizer({
        tokenCB: cb,
        logfilePath: tmpLog('complex'),
        isRecordTerminator: function (lines: string[]) {
          return lines[lines.length - 1] === '.';
        },
        parseRecord: function (lines: string[]) {
          return { body: lines.slice(0, -1).join('|') };
        },
      });

      t.parse('line-1');
      t.parse('line-2');
      expect(cb.called).to.equal(false);

      t.parse('.');
      expect(cb.calledOnce).to.equal(true);
      expect(cb.firstCall.args[0]).to.deep.equal({ body: 'line-1|line-2' });
    });

    it('resets the buffer after flushing so the next record is independent', function () {
      const cb = sinon.spy();
      const t = new ComplexLogTokenizer({
        tokenCB: cb,
        logfilePath: tmpLog('complex-reset'),
        isRecordTerminator: function (lines: string[]) {
          return lines[lines.length - 1] === '.';
        },
        parseRecord: function (lines: string[]) {
          return { count: lines.length - 1 };
        },
      });

      t.parse('a');
      t.parse('.');
      t.parse('b');
      t.parse('c');
      t.parse('.');

      expect(cb.getCall(0).args[0]).to.deep.equal({ count: 1 });
      expect(cb.getCall(1).args[0]).to.deep.equal({ count: 2 });
    });

    it('skips the tokenCB when parseRecord returns a falsy value', function () {
      const cb = sinon.spy();
      const t = new ComplexLogTokenizer({
        tokenCB: cb,
        logfilePath: tmpLog('complex-skip'),
        isRecordTerminator: function (lines: string[]) {
          return lines[lines.length - 1] === '.';
        },
        parseRecord: function () {
          return null;
        },
      });

      t.parse('x');
      t.parse('.');
      expect(cb.called).to.equal(false);
    });
  });
});
