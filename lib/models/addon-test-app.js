var fs         = require('fs-extra');
var path       = require('path');
var util       = require('util');
var App        = require('./app');
var pristine   = require('../utilities/pristine');
var copyFixtureFiles = require('../utilities/copy-fixture-files');
var RSVP = require('rsvp');

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

  return pristine.createApp(appName, options)
    .then(function(appPath) {
      app.path = appPath;
      return options.noFixtures ?
        RSVP.resolve() :
        copyFixtureFiles(appName, appPath, options.fixturesPath);
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

module.exports = AddonTestApp;
