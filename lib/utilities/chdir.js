'use strict';

const debug = require('./debug');

module.exports = function(path) {
  debug('chdir; path=%s', path);
  process.chdir(path);
};
