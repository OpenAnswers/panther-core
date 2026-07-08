//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const { Api } = require('../../../app/controller/api');
const { Field } = require('../../../lib/field');

describe('Unit::EventConsole::controller::api', function () {
  function mockRes() {
    const res: any = {};
    res.status = sinon.stub().returns(res);
    res.json = sinon.stub().returns(res);
    res.send = sinon.stub().returns(res);
    return res;
  }

  describe('get(name, req, res, next)', function () {
    it('returns 404 JSON when the named accessor is absent', function () {
      const res = mockRes();
      Api.get('does_not_exist', {}, res);
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.firstCall.args[0].name).to.equal('error');
    });

    it('sends the accessor result when present', function () {
      const res = mockRes();
      Api.get('fields', {}, res);
      expect(res.send.calledOnce).to.be.true;
      const payload = res.send.firstCall.args[0];
      expect(payload.name).to.equal('fields');
      expect(payload.data).to.deep.equal(Field.list());
    });
  });

  describe('get_id(name, req, res, next)', function () {
    it('returns 404 when the accessor is unknown', function () {
      const res = mockRes();
      Api.get_id('nosuch', { params: { id: 'x' } }, res);
      expect(res.status.calledWith(404)).to.be.true;
    });

    it('returns 404 when the accessor returns no data for the id', function () {
      const res = mockRes();
      Api.get_id('action', { params: { id: 'no-such-action' } }, res);
      expect(res.status.calledWith(404)).to.be.true;
    });

    it('returns the accessor payload when data is present', function () {
      const res = mockRes();
      Api.get_id('field', { params: { id: 'node' } }, res);
      expect(res.send.calledOnce).to.be.true;
      expect(res.send.firstCall.args[0].id).to.equal('node');
      expect(res.send.firstCall.args[0].data).to.equal(Field.definition.node);
    });
  });

  describe('field accessors', function () {
    it('fields() returns { name: "fields", data: Field.list() }', function () {
      expect(Api.fields()).to.deep.equal({ name: 'fields', data: Field.list() });
    });

    it('fields_obj() returns the full Field.definition', function () {
      expect(Api.fields_obj().data).to.equal(Field.definition);
    });
  });

  describe('action / select / option accessors', function () {
    it('action(id) returns undefined when id is unknown', function () {
      expect(Api.action('nope')).to.be.undefined;
    });

    it('select(id) returns undefined when id is unknown', function () {
      expect(Api.select('nope')).to.be.undefined;
    });

    it('option(id) returns undefined when id is unknown', function () {
      expect(Api.option('nope')).to.be.undefined;
    });

    it('actions() / selects() / options() return a types_list payload', function () {
      expect(Api.actions().name).to.equal('actions');
      expect(Api.selects().name).to.equal('selects');
      expect(Api.options().name).to.equal('options');
    });
  });
});
