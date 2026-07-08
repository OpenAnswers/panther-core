//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const { makeSocket } = require('../../helpers/socket_mock');
const { getHandler } = require('../../helpers/load_handler');

const fs = require('fs');
const Errors = require('../../../lib/errors');
require('../../../app/socketio/certificate');

describe('Unit::EventConsole::socketio::certificate', function () {
  const handler = getHandler('certificate::client::archive');

  afterEach(function () {
    sinon.restore();
  });

  it('throws ValidationError when data is missing', function () {
    const socket = makeSocket();
    expect(() => handler(socket, null, () => {})).to.throw(Errors.ValidationError, /No data/);
  });

  it('throws ValidationError when path is missing', function () {
    const socket = makeSocket();
    expect(() => handler(socket, { file: 'x' }, () => {})).to.throw(Errors.ValidationError, /"path"/);
  });

  it('throws ValidationError when file is missing', function () {
    const socket = makeSocket();
    expect(() => handler(socket, { path: 'p' }, () => {})).to.throw(Errors.ValidationError, /"file"/);
  });

  it('reads the archive file and invokes callback with { client: <contents> }', function (done) {
    // The handler uses fs.readFileAsync (bluebird-promisified). Stubbing
    // fs.readFile is what promisifyAll reads under.
    sinon.stub(fs, 'readFile').callsFake((_p: any, _opts: any, cb: any) => {
      cb(null, Buffer.from('BIN-CONTENTS'));
    });

    const socket = makeSocket();
    handler(socket, { path: 'sub', file: 'archive.zip' }, function (err: any, payload: any) {
      try {
        expect(err).to.equal(null);
        expect(payload).to.have.property('client');
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it('invokes callback with an error string when the file read fails', function (done) {
    sinon.stub(fs, 'readFile').callsFake((_p: any, _opts: any, cb: any) => {
      cb(new Error('ENOENT'));
    });

    const socket = makeSocket();
    handler(socket, { path: 'sub', file: 'missing.zip' }, function (errStr: any) {
      try {
        expect(errStr).to.be.a('string').that.contains('ENOENT');
        done();
      } catch (e) {
        done(e);
      }
    });
  });
});
