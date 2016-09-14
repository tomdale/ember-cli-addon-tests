var fs         = require('fs-extra');
var path       = require('path');
var findup     = require('findup-sync');
var startServer = require('../commands/start-server');
var chdir      = require('../utilities/chdir');
var debug      = require('../utilities/debug');
var runCommand = require('../utilities/run-command');
var pristine   = require('../utilities/pristine');
var RSVP = require('rsvp');
var copy = RSVP.denodeify(require('cpr'));

function AddonTestApp() {
}

// Public API for putting an app under test. If the app doesn't
// exist already, it will create it and put it into the `pristine`
// directory, then put a copy into `under-test`. Subsequent calls
// to `createApp()` will use the pristine app as a cache.
AddonTestApp.prototype.create = function(appName, options) {
  this.appName = appName;
  options = options || {};

  var app = this;

  return pristine.cloneApp(appName, options)
    .then(function(appPath) {
      app.path = appPath;
      return copyFixtureFiles(appName, appPath, options.fixturesPath);
    })
    .then(function() {
      return app;
    });
};

AddonTestApp.prototype.run = function() {
  var previousCwd = process.cwd();
  chdir(this.path);

  return runCommand.apply(null, arguments)
    .finally(function() {
      chdir(previousCwd);
    });
};

AddonTestApp.prototype.runEmberCommand = function() {
  var cliPath = path.join(this.path, 'node_modules', 'ember-cli', 'bin', 'ember');
  var args = Array.prototype.slice.apply(arguments);

  return this.run.apply(this, [cliPath].concat(args));
};

AddonTestApp.prototype.filePath = function(filePath) {
  return path.join(this.path, filePath);
};

AddonTestApp.prototype.editPackageJSON = function(cb) {
  var packageJSONPath = path.join(this.path, 'package.json');
  var pkg = fs.readJsonSync(packageJSONPath);
  cb(pkg);
  fs.writeJsonSync(packageJSONPath, pkg);
};

AddonTestApp.prototype.startServer = function(options) {
  var app = this;
  var previousCwd = process.cwd();
  process.chdir(app.path);

  return startServer(options)
    .then(function(server) {
      app.server = server;
      process.chdir(previousCwd);
    });
};

AddonTestApp.prototype.stopServer = function() {
  if (!this.server) {
    throw new Error("You must call `startServer()` before calling `stopServer()`.");
  }

  this.server.kill('SIGINT');
  this.server = null;

  return RSVP.resolve();
};

function copyFixtureFiles(appName, destDir, fixturesPath) {
  fixturesPath = findup(fixturesPath || 'test/fixtures');

  if (!fixturesPath) {
    fixturesPath = findup('tests/fixtures');
  }

  if (!fixturesPath) {
    throw new Error("Could not find fixtures directory. Make sure you have a fixtures directory in your `test/` directory. You may encounter this issue if you have npm linked this package; copy it to your node_modules directory instead.");
  }

  var sourceDir = path.join(fixturesPath, appName);

  debug("copying fixtures; from=%s; to=%s", sourceDir, destDir);

  return copy(sourceDir, destDir, {
    overwrite: true
  });
}

module.exports = AddonTestApp;
