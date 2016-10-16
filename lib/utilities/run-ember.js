'use strict';

var path = require('path');
var findup = require('findup-sync');
var runCommand = require('./run-command');

module.exports = function(command, options) {
  var emberCLIPath = findup('node_modules/ember-cli', {
    cwd: __dirname
  });

  var args = [path.join(emberCLIPath, 'bin', 'ember'), command].concat(options);

  return runCommand.apply(undefined, args);
};
