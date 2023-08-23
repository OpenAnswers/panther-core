/*
 * Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

Ext.Loader.setConfig({
  enabled: true,
  paths: {
    Ext: 'ext-4.2.1/src',
    AlertConsole: 'oaec',
    'Ext.ux': 'ux',
  },
});

Ext.application({
  name: 'AlertConsole',
  appFolder: 'oaec',
  autoCreateViewport: true,

  models: ['Alert', 'User'],
  stores: ['Alerts', 'Users'],
  controllers: ['AlertList', 'AlertSeverity', 'Detail', 'UserPreference', 'UserAdmin'],
});
