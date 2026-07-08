'use strict';

module.exports = {
  require: ['tsx/cjs', 'test/mocha_helpers.ts', 'chai'],
  reporter: ['spec'],
  ui: ['bdd'],
  exit: true,
};
