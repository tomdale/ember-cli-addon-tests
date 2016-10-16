'use strict';

var runEmber = require('./run-ember');

module.exports = function(name, options) {
  var args = [name, '--disable-analytics', '--watcher=node', '--skip-git'];
  if (options) {
    args = args.concat(options);
  }

  return runEmber('new', args);
};
