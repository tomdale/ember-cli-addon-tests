var path       = require('path');
var startServer = require('../commands/start-server');
var chdir      = require('../utilities/chdir');
var runCommand = require('../utilities/run-command');
var killCliProcess = require('../utilities/kill-cli-process');
var RSVP = require('rsvp');

function App(path) {
  this.path = path;
}

App.prototype.run = function() {
  var previousCwd = process.cwd();
  chdir(this.path);

  return runCommand.apply(null, arguments)
    .finally(function() {
      chdir(previousCwd);
    });
};

App.prototype.runEmberCommand = function() {
  var cliPath = path.join(this.path, 'node_modules', 'ember-cli', 'bin', 'ember');
  var args = Array.prototype.slice.apply(arguments);

  return this.run.apply(this, [cliPath].concat(args));
};

App.prototype.filePath = function(filePath) {
  return path.join(this.path, filePath);
};

App.prototype.startServer = function(options) {
  var app = this;
  var previousCwd = process.cwd();
  process.chdir(app.path);

  return startServer(options)
    .then(function(server) {
      app.server = server;
      process.chdir(previousCwd);
    });
};

App.prototype.stopServer = function() {
  if (!this.server) {
    throw new Error("You must call `startServer()` before calling `stopServer()`.");
  }

  killCliProcess(this.server);
  this.server = null;

  return RSVP.resolve();
};

module.exports = App;
