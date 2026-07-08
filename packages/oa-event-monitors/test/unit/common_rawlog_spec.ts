//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

process.env.NODE_ENV = 'test';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { expect } = require('../mocha_helpers');

const RawLog = require('../../common/rawlog');

describe('Unit::EventMonitors::RawLog', function () {
  const created_files: string[] = [];

  function tmpPath(label: string) {
    const p = path.join(
      os.tmpdir(),
      `oamon-rawlog-${label}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.log`
    );
    created_files.push(p);
    return p;
  }

  after(function () {
    for (const p of created_files) {
      try {
        fs.unlinkSync(p);
      } catch {
        /* ignore */
      }
    }
  });

  describe('construction', function () {
    it('throws when called with fewer than 2 arguments', function () {
      expect(function () {
        new RawLog({ filename: 'x' });
      }).to.throw('Incorrect arguments to RawLog');
    });

    it('invokes the callback with null once the stream is open', function (done: Function) {
      const p = tmpPath('ok');
      new RawLog({ filename: p }, function (err: any) {
        expect(err).to.equal(null);
        expect(fs.existsSync(p)).to.equal(true);
        done();
      });
    });

    it('invokes the callback with null when filename is missing (no stream opened)', function (done: Function) {
      new RawLog({}, function (err: any) {
        expect(err).to.equal(null);
        done();
      });
    });
  });

  describe('log()', function () {
    it('writes the supplied data followed by a newline', function (done: Function) {
      const p = tmpPath('write');
      const rl = new RawLog({ filename: p }, function (err: any) {
        expect(err).to.equal(null);
        rl.log('hello world');
        rl.log('second line');
        rl.logstream.end(function () {
          const contents = fs.readFileSync(p, 'utf8');
          expect(contents).to.equal('hello world\nsecond line\n');
          done();
        });
      });
    });

    it('appends to an existing file rather than truncating', function (done: Function) {
      const p = tmpPath('append');
      fs.writeFileSync(p, 'pre-existing\n');

      const rl = new RawLog({ filename: p }, function (err: any) {
        expect(err).to.equal(null);
        rl.log('new line');
        rl.logstream.end(function () {
          const contents = fs.readFileSync(p, 'utf8');
          expect(contents).to.equal('pre-existing\nnew line\n');
          done();
        });
      });
    });
  });
});
