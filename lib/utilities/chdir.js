"use strict";

var debug = require('./debug');

module.exports = function(path) {
  debug("chdir; path=" + path);
  process.chdir(path);
};
