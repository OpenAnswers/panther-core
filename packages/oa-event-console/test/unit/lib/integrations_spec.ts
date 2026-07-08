//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');

const {
  Integrations,
  Integration,
  HttpIntegration,
  HttpRedirectIntegration,
  CreateNewRuleIntegration,
  ZendeskTicketIntegration
} = require('../../../lib/integrations');

describe('Unit::EventConsole::lib::integrations', function() {

  describe('Integration (base class)', function() {
    it('replace_fields substitutes {field} tokens from an event object', function() {
      const i = new Integration();
      expect(i.replace_fields('id={id} sev={severity}', { id: 'abc', severity: 4 }))
        .to.equal('id=abc sev=4');
    });

    it('run() on the base class throws NotImplementedError', function() {
      const i = new Integration();
      expect(() => i.run({})).to.throw(/run is not defined/);
    });

    it('static description() on the base class throws NotImplementedError', function() {
      expect(() => Integration.description()).to.throw(/description not implemented/);
    });
  });

  describe('HttpIntegration', function() {
    it('defaults method to GET when not provided', function() {
      const h = new HttpIntegration('http://x', {});
      expect(h.method).to.equal('GET');
      expect(h.body).to.equal('');
    });

    it('description() exposes the methods select and url/header/body inputs', function() {
      const d = HttpIntegration.description();
      expect(d.name).to.equal('HTTP Request');
      const names = d.input.map((i: any) => i.name);
      expect(names).to.include.members(['method', 'url', 'header', 'body']);
    });

    it('description() matches the full published shape', function() {
      expect(Integrations.types_description.http).to.eql({
        name: 'HTTP Request',
        input: [
          { label: 'Name',   name: 'name',   placeholder: 'This name will appear in the context menu', type: 'text', validation: /^[\w\s]+$/ },
          { label: 'Method', name: 'method', type: 'select', values: ['GET', 'POST', 'PUT', 'DELETE'] },
          { label: 'URL',    name: 'url',    type: 'text', validation: '' },
          { label: 'Header', name: 'header', type: 'text' },
          { label: 'Body',   name: 'body',   type: 'textarea' }
        ]
      });
    });
  });

  describe('HttpRedirectIntegration', function() {
    it('run() returns a {location} with substituted fields', function(done) {
      const r = new HttpRedirectIntegration('/view/{id}');
      r.run({ id: 'abc' }, (err: any, out: any) => {
        try {
          expect(err).to.equal(null);
          expect(out.location).to.equal('/view/abc');
          done();
        } catch (e) { done(e); }
      });
    });
  });

  describe('CreateNewRuleIntegration', function() {
    it('run() redirects to /rules/create?id=…', function(done) {
      const c = new CreateNewRuleIntegration('ignored');
      c.run({ id: 'evid' }, (err: any, out: any) => {
        try {
          expect(err).to.equal(null);
          expect(out.location).to.equal('/rules/create?id=evid');
          done();
        } catch (e) { done(e); }
      });
    });
  });

  describe('Integrations (registry)', function() {
    it('types_list exposes the registered integration keys', function() {
      const list = Integrations.types_list();
      expect(list).to.include.members(['http', 'zendesk_ticket', 'ses', 'http_redirect', 'create_rule']);
    });

    it('types maps each key to its integration class', function() {
      expect(Integrations.types.http).to.equal(HttpIntegration);
      expect(Integrations.types.zendesk_ticket).to.equal(ZendeskTicketIntegration);
      expect(Integrations.types.http_redirect).to.equal(HttpRedirectIntegration);
      expect(Integrations.types.create_rule).to.equal(CreateNewRuleIntegration);
    });

    it('types_description carries a default "name" input for each type', function() {
      for (const t of Integrations.types_list()) {
        const def = Integrations.types_description[t];
        expect(def, `type ${t}`).to.have.property('input');
        expect(def.input[0].name, `type ${t} first input`).to.equal('name');
      }
    });
  });

  describe('ZendeskTicketIntegration', function() {
    it('initClass populates ticket_types and ticket_priorities', function() {
      expect(ZendeskTicketIntegration.ticket_types).to.deep.equal(['Incident', 'Problem', 'Question', 'Task']);
      expect(ZendeskTicketIntegration.ticket_priorities).to.deep.equal(['Urgent', 'High', 'Normal', 'Low']);
    });

    it('description() matches the full published shape', function() {
      expect(Integrations.types_description.zendesk_ticket).to.eql({
        name: 'ZenDesk Ticket',
        input: [
          { label: 'Name',      name: 'name',      placeholder: 'This name will appear in the context menu', type: 'text', validation: /^[\w\s]+$/ },
          { label: 'Subdomain', name: 'subdomain', placeholder: 'your_domain',     type: 'text',          validation: /[^\s_]/, aftertext: '.zendesk.com' },
          { label: 'Email',     name: 'email',     placeholder: 'email@domain.com', type: 'email' },
          { label: 'Authentication', name: 'auth', placeholder: 'Token or Password', type: 'select_string', types: ['Token', 'Password'] },
          { label: 'Ticket Settings', type: 'divider' },
          { label: 'Type',     name: 'ticket_type',       type: 'select', values: ['Incident', 'Problem', 'Question', 'Task'] },
          { label: 'Priority', name: 'ticket_priorities', type: 'select', values: ['Urgent', 'High', 'Normal', 'Low'] },
          { label: 'Subject',  name: 'ticket_subject',    placeholder: 'Subject with event {fields}', type: 'text' },
          { label: 'Comment',  name: 'ticket_comment',    placeholder: 'Comment with event {fields}', type: 'textarea' }
        ]
      });
    });
  });
});
