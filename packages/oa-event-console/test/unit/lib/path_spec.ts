//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const nodePath = require('path');
const { expect } = require('../../mocha_helpers');
const { Path } = require('../../../lib/path');

describe('Unit::EventConsole::lib::path', function() {

  it('initialises key app-relative directories off Path.base', function() {
    expect(Path.base).to.be.a('string');
    expect(Path.app).to.equal(nodePath.join(Path.base, 'app'));
    expect(Path.routes).to.equal(nodePath.join(Path.app, 'route'));
    expect(Path.socketio).to.equal(nodePath.join(Path.app, 'socketio'));
    expect(Path.views).to.equal(nodePath.join(Path.base, 'app', 'view'));
    expect(Path.emails).to.equal(nodePath.join(Path.base, 'app', 'emails'));
    expect(Path.assets).to.equal(nodePath.join(Path.base, 'app', 'assets'));
    expect(Path.public).to.equal(nodePath.join(Path.base, 'public'));
  });

  describe('resolve()', function() {
    it('delegates to node path.resolve', function() {
      expect(Path.resolve('/a', 'b')).to.equal(nodePath.resolve('/a', 'b'));
    });
  });

  describe('join()', function() {
    it('delegates to node path.join', function() {
      expect(Path.join('a', 'b', 'c')).to.equal(nodePath.join('a', 'b', 'c'));
    });
  });

  describe('local()', function() {
    it('joins each argument onto Path.base', function() {
      expect(Path.local('foo', 'bar')).to.equal(nodePath.join(Path.base, 'foo', 'bar'));
    });
  });

  describe('add() / add_local()', function() {
    afterEach(function() {
      delete Path.unique_test_name;
      delete Path.unique_test_local;
    });

    it('attaches a named property', function() {
      Path.add('unique_test_name', '/tmp/unique');
      expect(Path.unique_test_name).to.equal('/tmp/unique');
    });

    it('attaches a local-resolved property', function() {
      Path.add_local('unique_test_local', 'rel/path');
      expect(Path.unique_test_local).to.equal(nodePath.join(Path.base, 'rel/path'));
    });
  });
});
