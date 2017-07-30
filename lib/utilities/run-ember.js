'use strict';

const path = require('path');
const findup = require('findup-sync');
const runCommand = require('./run-command');

module.exports = function(command, options, dirPath) {
  let emberCLIPath = findup('node_modules/ember-cli', {
    cwd: dirPath || __dirname
  });

  let args = [path.join(emberCLIPath, 'bin', 'ember'), command].concat(options);

  return runCommand.apply(undefined, args);
};
