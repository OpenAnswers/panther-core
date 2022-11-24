'use strict';

module.exports = {
  require: ['coffeescript/register', 'test/mocha_helpers.coffee', 'chai'],
  reporter: ['spec'],
  ui: ['bdd'],
  exit: true,
};
