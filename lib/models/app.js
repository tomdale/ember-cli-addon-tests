'use strict';

const path       = require('path');
const startServer = require('../commands/start-server');
const chdir      = require('../utilities/chdir');
const runCommand = require('../utilities/run-command');
const killCliProcess = require('../utilities/kill-cli-process');

function App(path) {
  this.path = path;
}

App.prototype.run = function() {
  let previousCwd = process.cwd();
  chdir(this.path);

  function _finally() {
    chdir(previousCwd);
  }

  return runCommand.apply(null, arguments)
    .then(_finally, _finally);
};

App.prototype.runEmberCommand = function() {
  let cliPath = path.join(this.path, 'node_modules', 'ember-cli', 'bin', 'ember');
  let args = Array.prototype.slice.apply(arguments);

  return this.run.apply(this, [cliPath].concat(args));
};

App.prototype.filePath = function(filePath) {
  return path.join(this.path, filePath);
};

App.prototype.startServer = function(options) {
  let previousCwd = process.cwd();
  process.chdir(this.path);

  return startServer(options)
    .then(result => {
      this.server = result.server;
      this._longRunningServerPromise = result.longRunningServerPromise;
      process.chdir(previousCwd);
    });
};

App.prototype.stopServer = function() {
  if (!this.server) {
    throw new Error('You must call `startServer()` before calling `stopServer()`.');
  }

  killCliProcess(this.server);

  return this._longRunningServerPromise.catch(() => {
    this.server = null;
  });
};

module.exports = App;
