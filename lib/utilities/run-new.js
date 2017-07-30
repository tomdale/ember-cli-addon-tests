'use strict';

const runEmber = require('./run-ember');

module.exports = function(name, options) {
  let args = [name, '--disable-analytics', '--watcher=node', '--skip-git'];
  if (options) {
    args = args.concat(options);
  }

  return runEmber('new', args);
};
