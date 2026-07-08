//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Covers the re-exported `uuid` module on the Helpers class — the oa-helpers
// package makes it available as Helpers.uuid for any consumer that wants it.
// Originally this was node-uuid (1.4.7); now it's the maintained uuid
// package (v14). These tests lock in the replacement's API compatibility
// for the shapes we actually use in this monorepo:
//   * uuid.v1()                   — plain v1 UUID
//   * uuid.v1({ node: [6 bytes] }) — v1 with a fixed node identifier
//                                   (used by oa-event-console's express +
//                                    socketio middleware to stamp requests)

const expect = require('chai').expect;

const Helpers = require('../lib/helpers');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('Helpers.uuid (re-exported uuid module)', function () {
  it('is present on Helpers', function () {
    expect(Helpers.uuid).to.not.equal(undefined);
  });

  it('exposes v1 and v4 generator functions', function () {
    expect(Helpers.uuid.v1).to.be.a('function');
    expect(Helpers.uuid.v4).to.be.a('function');
  });

  describe('v1() (timestamp-based)', function () {
    it('returns a canonical UUID string', function () {
      const id = Helpers.uuid.v1();
      expect(id).to.be.a('string');
      expect(id).to.match(UUID_RE);
    });

    it('produces a different uuid on each call', function () {
      const a = Helpers.uuid.v1();
      const b = Helpers.uuid.v1();
      expect(a).to.not.equal(b);
    });

    it('sets the version nibble to 1', function () {
      // v1 UUIDs have the high nibble of the 3rd group set to 1.
      // xxxxxxxx-xxxx-Vxxx-xxxx-xxxxxxxxxxxx  ← V is the version nibble
      const id = Helpers.uuid.v1();
      const version_nibble = id.split('-')[2][0];
      expect(version_nibble).to.equal('1');
    });

    it('accepts an explicit { node: [...] } identifier (used by express/socketio)', function () {
      // Express middleware in oa-event-console stamps each request:
      //   req.uuid = uuid.v1({ node: self.app.uuid_node });
      // Verify the 6-byte node-override option is still honoured after the
      // node-uuid → uuid swap. node: [bytes] encodes the last 12 hex chars.
      const node = [0x01, 0x23, 0x45, 0x67, 0x89, 0xab];
      const id = Helpers.uuid.v1({ node });
      expect(id).to.match(UUID_RE);
      const node_hex = id.split('-')[4].toLowerCase();
      // uuid v1 sets the unicast/multicast bit on the first node byte;
      // strip that bit before comparing so the match is independent of it.
      const got_first_byte = parseInt(node_hex.slice(0, 2), 16) & 0xfe;
      expect(got_first_byte).to.equal(node[0] & 0xfe);
      expect(node_hex.slice(2)).to.equal('23456789ab');
    });
  });

  describe('v4() (random)', function () {
    it('returns a canonical UUID string', function () {
      const id = Helpers.uuid.v4();
      expect(id).to.match(UUID_RE);
    });

    it('sets the version nibble to 4', function () {
      const id = Helpers.uuid.v4();
      const version_nibble = id.split('-')[2][0];
      expect(version_nibble).to.equal('4');
    });
  });
});
