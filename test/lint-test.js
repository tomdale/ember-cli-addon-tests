'use strict';

const lint = require('mocha-eslint');

lint([
  'lib',
  'scripts',
  'test'
], {
  timeout: 5000
});
