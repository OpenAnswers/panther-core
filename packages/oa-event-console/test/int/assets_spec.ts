//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Asset pipeline integration test: the Vite-built CSS bundles are served by
// the running Express app and contain the selectors the templates rely on.
// Replaces the `global.css`/`console.css` checks from test/func/client_spec.ts.

/* eslint-disable @typescript-eslint/no-var-requires */
const { expect } = require('../mocha_helpers');
const { getConsoleApp } = require('./_helpers/console_app');
const { ConsoleClient } = require('./_helpers/console_client');

describe('Integration::Assets', function () {
  this.timeout(30_000);

  let client: any;
  let assetHref: (name: string) => string;

  before(async function () {
    const app = await getConsoleApp();
    client = new ConsoleClient({ baseUrl: app.baseUrl, secret: app.secret });

    const { buildAssetHelpers } = require('../../lib/assets');
    const { css } = buildAssetHelpers();
    // css(name) returns an HTML <link> tag — extract the href so we can GET it.
    assetHref = (name: string) => {
      const tag = css(name);
      const match = tag.match(/href="([^"]+)"/);
      if (!match) throw new Error(`Could not resolve asset '${name}': ${tag}`);
      return match[1];
    };
  });

  it('serves the built global.css with the expected selectors', async function () {
    const res = await client.get(assetHref('global_css'));
    expect(res.status).to.equal(200);
    expect(res.body).to.match(/\.input-group-rules/);
    expect(res.body).to.match(/@media print/);
  });

  it('serves the built console.css with the unacknowledged state selector', async function () {
    const res = await client.get(assetHref('console_css'));
    expect(res.status).to.equal(200);
    expect(res.body).to.match(/\.unacknowledged\s*\{/);
  });
});
