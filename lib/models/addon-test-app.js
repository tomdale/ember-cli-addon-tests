'use strict';

const fs         = require('fs-extra');
const path       = require('path');
const util       = require('util');
const App        = require('./app');
const pristine   = require('../utilities/pristine');
const copyFixtureFiles = require('../utilities/copy-fixture-files');

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

  return pristine.createApp(appName, options)
    .then(appPath => {
      this.path = appPath;
      return options.noFixtures ?
        Promise.resolve() :
        copyFixtureFiles(appName, appPath, options.fixturesPath);
    })
    .then(() => this);
};

AddonTestApp.prototype.editPackageJSON = function(cb) {
  let packageJSONPath = path.join(this.path, 'package.json');
  let pkg = fs.readJsonSync(packageJSONPath);
  cb(pkg);
  fs.writeJsonSync(packageJSONPath, pkg, {
    spaces: 2
  });
};

module.exports = AddonTestApp;
