//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const express  = require('express');
const request  = require('supertest');
const { ExpressApp } = require('../../../lib/express');

// ExpressApp.create() wires up MongoStore, passport, routes — too much to
// instantiate in a unit test. We exercise the two pure methods on the
// prototype (set_locals, setup_error_handler) against a bare-bones app.
describe('Unit::EventConsole::lib::express', function() {

  function bareInstance() {
    const app = express();
    return { app, set_locals: ExpressApp.prototype.set_locals, setup_error_handler: ExpressApp.prototype.setup_error_handler };
  }

  describe('set_locals', function() {
    it('sets values on app.locals under the given name', function() {
      const ctx: any = bareInstance();
      ctx.set_locals.call(ctx, 'panther', 'yes');
      expect(ctx.app.locals.panther).to.equal('yes');
    });
  });

  describe('setup_error_handler', function() {
    function renderRecorder() {
      // Wire a minimal render so supertest can see which view was chosen.
      return function(_req: any, res: any, next: any) {
        res.render = function(view: string, locals: any) {
          res.json({ _view: view, ...(locals ?? {}) });
        };
        next();
      };
    }

    it('404 errors render error/404', async function() {
      const ctx: any = bareInstance();
      ctx.app.use(renderRecorder());
      ctx.app.get('/boom', function(_req: any, _res: any, next: any) {
        const err: any = new Error('gone'); err.status = 404; next(err);
      });
      ctx.setup_error_handler.call(ctx);

      const res = await request(ctx.app).get('/boom');
      expect(res.body._view).to.equal('error/404');
    });

    it('401 errors render error/401 with the error message', async function() {
      const ctx: any = bareInstance();
      ctx.app.use(renderRecorder());
      ctx.app.get('/nope', function(_req: any, _res: any, next: any) {
        const err: any = new Error('Not Permitted'); err.status = 401; next(err);
      });
      ctx.setup_error_handler.call(ctx);

      const res = await request(ctx.app).get('/nope');
      expect(res.body._view).to.equal('error/401');
      expect(res.body.error).to.equal('Not Permitted');
    });

    it('everything else renders error/500', async function() {
      const ctx: any = bareInstance();
      ctx.app.use(renderRecorder());
      ctx.app.get('/crash', function(_req: any, _res: any, next: any) {
        next(new Error('boom'));
      });
      ctx.setup_error_handler.call(ctx);

      const res = await request(ctx.app).get('/crash');
      expect(res.body._view).to.equal('error/500');
    });
  });
});
