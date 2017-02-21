"use strict";

var path  = require('path');
var debug = require('./debug');
var temp  = require('./temp');
var chdir = require('./chdir');
var fs = require('fs-extra');
var findup = require('findup-sync');
var existsSync       = fs.existsSync;
var Promise = require('rsvp').Promise;
var moveDirectory    = require('./move-directory');
var symlinkDirectory = require('./symlink-directory');
var runCommand       = require('./run-command');
var runEmber         = require('./run-ember');
var runNew           = require('./run-new');
var mkdirp           = require('mkdirp');

var previousCwd;

function cloneApp(appName, options) {
  var tempDir = temp.ensureCreated();
  previousCwd = process.cwd();

  debug('previousCwd=%s', previousCwd);

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
    return installPristineApp(appName, options)
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

function installPristineApp(appName, options) {
  var hasNodeModules = hasPristineNodeModules();
  var hasBowerComponents = hasPristineBowerComponents();
  var extraOptions = [];
  var emberVersion = options.emberVersion || 'canary';
  var emberDataVersion = options.emberDataVersion || 'emberjs/data#master';

  // First, determine if we can skip installing npm packages
  // or Bower components if we have a pristine set of dependencies
  // already.

  // Fresh install
  if (!hasNodeModules && !hasBowerComponents) {
    debug("no node_modules or bower_components");
  // bower_components but no node_modules
  } else if (!hasNodeModules && hasBowerComponents) {
    debug("no node_modules but existing bower_components");
    extraOptions = ['--skip-bower'];
  // node_modules but no bower_components
  } else if (hasNodeModules && !hasBowerComponents) {
    debug("no bower_components but existing node_modules");
    extraOptions = ['--skip-npm'];
  // Everything is already there
  } else {
    debug("existing node_modules and bower_components");
    extraOptions = ['--skip-npm', '--skip-bower'];
  }

  chdir(temp.pristinePath);

  var args = extraOptions.concat(runCommandOptions);

  var promise = runNew(appName, args)
    .catch(handleResult)
    .then(function() {
      chdir(path.join(temp.pristinePath, appName));
    })
    .then(addEmberDataToDependencies(appName, emberDataVersion))
    .then(removeEmberSourceFromDependencies(appName, emberVersion));

  // If we installed a fresh node_modules or bower_components directory,
  // grab those as pristine copies we can use in future runs.
  if (!hasNodeModules) {
    promise = promise.then(function() {
        debug('installing ember-disable-prototype-extensions');
        return runCommand('npm', 'install', 'ember-disable-prototype-extensions');
      })
      .then(function() {
        debug("installed ember-disable-prototype-extension");
      })
      .then(function() {
        return runCommand('npm', 'install');
      })
      .then(function() {
        debug('installed ember-data ' + emberDataVersion);
      })
      .then(symlinkAddon(appName));
  }

  promise = promise.then(addEmberToBowerJSON(appName, emberVersion))
                   .then(removeEmberDataFromBowerJSON(appName))
                   .then(addAddonUnderTestToDependencies(appName));

  if (!hasBowerComponents) {
    promise = promise.then(function() {
      return runCommand('bower', 'install');
    })
    .then(function() {
      debug('installed ember ' + emberVersion);
    });
  }

  if (!hasNodeModules) {
    promise = promise.then(movePristineNodeModules(appName));
  }

  // make sure there are now bower components
  // (new projects don't have bower components and won't have this folder)
  if (!hasBowerComponents && hasPristineBowerComponents()) {
    promise = promise.then(movePristineBowerComponents(appName));
  }

  return promise.then(linkDependencies(appName))
    // at this point we have all deps available, so we can run ember-cli
    .then(runAddonGenerator);
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

function addEmberToBowerJSON(appName, version) {
  return function() {
    var bowerJSONPath = path.join(temp.pristinePath, appName, 'bower.json');
    var bowerJSON = fs.readJsonSync(bowerJSONPath);

    bowerJSON.resolutions = {
      "ember": version
    };

    bowerJSON.dependencies['ember'] = version;

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

function symlinkAddon(appName) {
  return function() {
    var pkg = findAddonPackageJSON();
    var addonPath = findAddonPath();
    var addonSymlinkPath = path.join(temp.pristinePath, appName, 'node_modules', pkg.name);
    var pkgScope = path.dirname(pkg.name);

    debug("symlinking %s", pkg.name);

    if (pkgScope !== '.') {
      debug("symlink: creating directory %s for scoped package name", pkgScope);
      // In case the package has a scoped name, make sure the scope directoy exists before symlinking
      mkdirp.sync(path.join(temp.pristinePath, appName, 'node_modules', pkgScope));
    }

    if (existsSync(addonSymlinkPath)) {
      var stats = fs.lstatSync(addonSymlinkPath);
      if (stats.isSymbolicLink()) {
        debug("%s is already symlinked", pkg.name);
        return;
      }

      fs.removeSync(addonSymlinkPath);
    }

    symlinkDirectory(addonPath, addonSymlinkPath);
  };
}

function addEmberDataToDependencies(appName, version) {
  return function() {
    var packageJSONPath = path.join(temp.pristinePath, appName, 'package.json');

    debug('installing ember-data ' + version);

    var packageJSON = fs.readJsonSync(packageJSONPath);

    packageJSON.devDependencies['ember-data'] = version;

    fs.writeJsonSync('package.json', packageJSON);
  };
}

function removeEmberSourceFromDependencies(appName, version) {
  return function() {
    var packageJSONPath = path.join(temp.pristinePath, appName, 'package.json');

    var packageJSON = fs.readJsonSync(packageJSONPath);

    if (version === 'canary' && packageJSON.devDependencies.hasOwnProperty('ember-source')) {
      // ember-source does not support canary builds, therefore we will remove this entry and
      // use ember from bower
      debug('removing ember-source from NPM ');

      delete packageJSON.devDependencies['ember-source'];
      fs.writeJsonSync('package.json', packageJSON);
    }
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

function runAddonGenerator() {
  var pkg = findAddonPackageJSON();

  debug('running %s generator', pkg.name);

  var blueprintName = pkg.name;
  var emberAddon = pkg['ember-addon'];

  if (emberAddon && emberAddon.defaultBlueprint) {
    blueprintName = emberAddon.defaultBlueprint;
  }

  return runEmber('generate', [blueprintName])
    .catch(function(){});
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
  var foundPath = findup('package.json', {
    cwd: previousCwd
  });

  if (foundPath) {
    debug('found addon package.json; path=%s', foundPath);
  } else {
    debug('couldn\'t find addon package.json');
  }

  return foundPath;
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
