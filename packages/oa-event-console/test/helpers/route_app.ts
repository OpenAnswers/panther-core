//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Helper for route unit tests. Mounts an express Router on a minimal app and
// replaces res.render with a JSON echo so we can assert the template name and
// locals without running a view engine. Optionally injects a user onto the
// request so auth-gated middleware passes.
//
// Usage:
//
//   const app = makeRouteApp(router, { user: { username: 'alice' }, mount: '/x' });
//   const res = await request(app).get('/x');
//   expect(res.body).to.deep.include({ _view: 'dashboard' });

const express = require('express');

type Options = {
  mount?: string;
  user?: any;
  session?: any;
  bodyParser?: boolean;
};

function makeRouteApp(router: any, opts: Options = {}) {
  const app = express();

  if (opts.bodyParser !== false) {
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
  }

  app.use(function (req: any, _res: any, next: any) {
    if (opts.user !== undefined) req.user = opts.user;
    req.session = opts.session ?? {};
    req.sessionID = 'test-session';
    next();
  });

  // Echo render() output as JSON so tests can assert without a view engine.
  app.use(function (_req: any, res: any, next: any) {
    res.render = function (view: string, locals: any) {
      res.json({ _view: view, ...(locals ?? {}) });
    };
    next();
  });

  app.use(opts.mount ?? '/', router);

  // Minimal error surface: make thrown errors reach supertest as 500 JSON.
  app.use(function (err: any, _req: any, res: any, _next: any) {
    res.status(err.status ?? 500).json({ _error: err.message, name: err.name });
  });

  return app;
}

module.exports = { makeRouteApp };
