var fs         = require('fs-extra');
var path       = require('path');
var findup     = require('findup-sync');
var util       = require('util');
var App        = require('./app');
var debug      = require('../utilities/debug');
var pristine   = require('../utilities/pristine');
var RSVP = require('rsvp');
var copy = RSVP.denodeify(require('cpr'));

function AddonTestApp() {
  App.call(this);
}

util.inherits(AddonTestApp, App);

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

AddonTestApp.prototype.editPackageJSON = function(cb) {
  var packageJSONPath = path.join(this.path, 'package.json');
  var pkg = fs.readJsonSync(packageJSONPath);
  cb(pkg);
  fs.writeJsonSync(packageJSONPath, pkg);
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
