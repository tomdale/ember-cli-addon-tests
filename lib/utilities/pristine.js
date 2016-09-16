"use strict";

var path  = require('path');
var debug = require('./debug');
var temp  = require('./temp');
var chdir = require('./chdir');
var fs = require('fs-extra');
var findup = require('findup-sync');
var existsSync       = fs.existsSync;
var runCommand       = require('./run-command');
var RSVP             = require('rsvp');
var Promise = RSVP.Promise;
var exec             = RSVP.denodeify(require('child_process').exec);
var moveDirectory    = require('./move-directory');
var symlinkDirectory = require('./symlink-directory');
var runCommand       = require('./run-command');

function cloneApp(appName) {
  var tempDir = temp.ensureCreated();
  var previousCwd = process.cwd();

  chdir(tempDir);

  var pristineAppPath = path.join(temp.pristinePath, appName);
  var underTestAppPath = path.join(temp.underTestPath, appName);

  // If this app was already tested, delete the copy.
  // This ensures that any modifications made during testing are
  // reset.
  if (existsSync(underTestAppPath)) {
    fs.removeSync(underTestAppPath);
  }

  // If a pristine version of the app doesn't exist, create it.
  if (!fs.existsSync(pristineAppPath)) {
    return installPristineApp(appName)
      .then(function() {
        copyUnderTestApp(pristineAppPath, underTestAppPath);
      })
      .then(function() {
        chdir(previousCwd);
        return underTestAppPath;
      });
  }

  copyUnderTestApp(pristineAppPath, underTestAppPath);
  chdir(previousCwd);

  return Promise.resolve(underTestAppPath);
}

module.exports = {
  cloneApp: cloneApp
};

function installPristineApp(appName) {
  var hasNodeModules = hasPristineNodeModules();
  var hasBowerComponents = hasPristineBowerComponents();
  var extraOptions = [];

  // First, determine if we can skip installing npm packages
  // or Bower components if we have a pristine set of dependencies
  // already.

  // Fresh install
  if (!hasNodeModules && !hasBowerComponents) {
    debug("no node_modules or bower_components");
  // bower_components but no node_modules
  } else if (!hasNodeModules && hasBowerComponents) {
    debug("no node_modules but existng bower_components");
    extraOptions = ['--skip-bower'];
  // node_modules but no bower_components
  } else if (hasNodeModules && !hasBowerComponents) {
    debug("no bower_components but existng node_modules");
    extraOptions = ['--skip-npm'];
  // Everything is already there
  } else {
    debug("existing node_modules and bower_components");
    extraOptions = ['--skip-npm', '--skip-bower'];
  }

  chdir(temp.pristinePath);

  var promise = applyCommand('new', appName, extraOptions)
    .catch(handleResult)
    .then(function() {
      chdir(path.join(temp.pristinePath, appName));
    })
    .then(addEmberDataCanaryToDependencies(appName));

  // If we installed a fresh node_modules or bower_components directory,
  // grab those as pristine copies we can use in future runs.
  if (!hasNodeModules) {
    promise = promise.then(function() {
        debug('installing ember-disable-prototype-extensions');
        return exec('npm install ember-disable-prototype-extensions');
      })
      .then(function() {
        debug("installed ember-disable-prototype-extension");
      })
      .then(function() {
        return exec('npm install');
      })
      .then(function() {
        debug('installed ember-data canary');
      })
      .then(movePristineNodeModules(appName))
      .then(symlinkAddon);
  }

  promise = promise.then(addEmberCanaryToBowerJSON(appName))
                   .then(removeEmberDataFromBowerJSON(appName));

  if (!hasBowerComponents) {
    promise = promise.then(function() {
      return exec('bower install');
    })
    .then(function() {
      debug("installed ember#canary");
    })
    .then(movePristineBowerComponents(appName));
  }

  return promise.then(addAddonUnderTestToDependencies(appName))
    .then(linkDependencies(appName));
}

function hasPristineNodeModules() {
  return existsSync(temp.pristineNodeModulesPath);
}

function hasPristineBowerComponents() {
  return existsSync(temp.pristineBowerComponentsPath);
}

function movePristineNodeModules(appName) {
  return function() {
    var nodeModulesPath = path.join(temp.pristinePath, appName, 'node_modules');
    moveDirectory(nodeModulesPath, temp.pristineNodeModulesPath);
  };
}

function movePristineBowerComponents(appName) {
  return function() {
    var bowerComponentsPath = path.join(temp.pristinePath, appName, 'bower_components');
    moveDirectory(bowerComponentsPath, temp.pristineBowerComponentsPath);
  };
}

function handleResult(result) {
  debug('handling result');
  throw result;
}

function copyUnderTestApp(pristineAppPath, underTestAppPath) {
  debug("copying pristine app; from=" + pristineAppPath + "; to=" + underTestAppPath);
  fs.copySync(pristineAppPath, underTestAppPath);
  debug("copying complete");

  chdir(underTestAppPath);
}

function addEmberCanaryToBowerJSON(appName) {
  return function() {
    var bowerJSONPath = path.join(temp.pristinePath, appName, 'bower.json');
    var bowerJSON = fs.readJsonSync(bowerJSONPath);

    bowerJSON.resolutions = {
      "ember": "canary"
    };

    bowerJSON.dependencies['ember'] = 'canary';

    fs.writeJsonSync(bowerJSONPath, bowerJSON);
  };
}

function removeEmberDataFromBowerJSON(appName) {
  return function() {
    var bowerJSONPath = path.join(temp.pristinePath, appName, 'bower.json');
    var bowerJSON = fs.readJsonSync(bowerJSONPath);

    delete bowerJSON.dependencies['ember-data'];

    fs.writeJsonSync(bowerJSONPath, bowerJSON);
  };
}

function symlinkAddon() {
  var pkg = findAddonPackageJSON();
  var addonPath = findAddonPath();
  var addonSymlinkPath = path.join(temp.pristineNodeModulesPath, pkg.name);

  debug("symlinking %s", pkg.name);

  if (existsSync(addonSymlinkPath)) {
    var stats = fs.lstatSync(addonSymlinkPath);
    if (stats.isSymbolicLink()) {
      debug("%s is already symlinked", pkg.name);
      return;
    }

    fs.removeSync(addonSymlinkPath);
  }

  symlinkDirectory(addonPath, addonSymlinkPath);
}

function addEmberDataCanaryToDependencies(appName) {
  return function() {
    var pkg = findAddonPackageJSON();
    var packageJSONPath = path.join(temp.pristinePath, appName, 'package.json');

    debug('installing ember-data canary');

    var packageJSON = fs.readJsonSync(packageJSONPath);

    packageJSON.devDependencies['ember-data'] = 'emberjs/data#master';

    fs.writeJsonSync('package.json', packageJSON);
  };
}

function addAddonUnderTestToDependencies(appName) {
  return function() {
    var pkg = findAddonPackageJSON();
    var packageJSONPath = path.join(temp.pristinePath, appName, 'package.json');

    debug('installing %s as addon for application', pkg.name);

    // Read the current version of the FastBoot addon under test, then add that
    // to the Ember app's package.json.
    var packageJSON = fs.readJsonSync(packageJSONPath);

    packageJSON.devDependencies[pkg.name] = pkg.version;

    fs.writeJsonSync('package.json', packageJSON);
  };
}

function findAddonPath() {
  return path.dirname(findAddonPackageJSONPath());
}

function findAddonPackageJSON() {
  var pkgPath = findAddonPackageJSONPath();
  var pkg = fs.readJsonSync(pkgPath);
  return pkg;
}

function findAddonPackageJSONPath() {
  var lastPath;
  var foundPath;

  while (foundPath = findup('package.json', {
    cwd: lastPath ? path.join(lastPath, '../..') : path.join(__dirname, '../../..')
  })) {
    lastPath = foundPath;
  }

  debug('found addon package.json; path=%s', lastPath);

  return lastPath;
}

function linkDependencies(appName) {
  return function() {
    var nodeModulesAppPath = path.join(temp.pristinePath, appName, 'node_modules');
    var bowerComponentsAppPath = path.join(temp.pristinePath, appName, 'bower_components');

    symlinkDirectory(temp.pristineNodeModulesPath, nodeModulesAppPath);
    symlinkDirectory(temp.pristineBowerComponentsPath, bowerComponentsAppPath);
  };
}

var runCommandOptions = {
  // Note: We must override the default logOnFailure logging, because we are
  // not inside a test.
  log: function() {
    return; // no output for initial application build
  }
};

function applyCommand(command, name, flags) {
  var emberCLIPath = findup('node_modules/ember-cli', {
    cwd: __dirname
  });

  var args = [path.join(emberCLIPath, 'bin', 'ember'), command, '--disable-analytics', '--watcher=node', '--skip-git', name, runCommandOptions];

  flags.forEach(function(flag) {
    args.splice(2, 0, flag);
  });

  return runCommand.apply(undefined, args);
}

