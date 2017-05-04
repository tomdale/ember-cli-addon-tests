"use strict";

const path = require('path');
const debug = require('./debug');
const temp = require('./temp');
const chdir = require('./chdir');
const fs = require('fs-extra');
const findup = require('findup-sync');
const existsSync = fs.existsSync;
const Promise = require('rsvp').Promise;
const moveDirectory = require('./move-directory');
const symlinkDirectory = require('./symlink-directory');
const runCommand = require('./run-command');
const runEmber = require('./run-ember');
const runNew = require('./run-new');
const mkdirp = require('mkdirp');
const semver = require('semver');

// As of Ember-CLI@2.13.0, it no longer uses Bower by default
const usesBower = semver.lt(require('ember-cli/package').version, '2.13.0');
const runCommandOptions = {
  // Note: We must override the default logOnFailure logging, because we are
  // not inside a test.
  log: function() {
    return; // no output for initial application build
  }
};

let previousCwd;

/**
 * Creates a new application with the given name. If the application was created
 * previously, a fresh clone will be created.
 *
 * @param {String} appName
 * @param {Object} [options]
 * @param {String} [options.emberVersion]
 * @param {String} [options.emberDataVersion]
 */
function createApp(appName, options) {
  let tempDir = temp.ensureCreated();

  previousCwd = process.cwd();
  debug('previousCwd=%s', previousCwd);

  chdir(tempDir);

  let pristineAppPath = path.join(temp.pristinePath, appName);
  let underTestAppPath = path.join(temp.underTestPath, appName);

  // If this app was already tested, delete the copy.
  // This ensures that any modifications made during testing are
  // reset.
  if (existsSync(underTestAppPath)) {
    fs.removeSync(underTestAppPath);
  }

  // If a pristine version of the app doesn't exist, create one by installing it.
  let appInstallation;
  if (!fs.existsSync(pristineAppPath)) {
    appInstallation = installPristineApp(appName, options);
  } else {
    appInstallation = Promise.resolve();
  }

  return appInstallation.then(() => {
    copyUnderTestApp(pristineAppPath, underTestAppPath);
    chdir(previousCwd);
    return underTestAppPath;
  });
}

module.exports = {
  createApp
};

function installPristineApp(appName, options) {
  let hasNodeModules = hasPristineNodeModules();
  let hasBowerComponents = hasPristineBowerComponents();

  chdir(temp.pristinePath);

  // Install a vanilla app and cd into it
  let args = generateArgsForEmberNew(hasNodeModules, hasBowerComponents);
  let promise = runNew(appName, args)
    .catch(handleResult)
    .then(() => chdir(path.join(temp.pristinePath, appName)));

  let setupOptions = {
    appName,
    hasNodeModules,
    hasBowerComponents,
    emberVersion: options.emberVersion || 'canary',
    emberDataVersion: options.emberDataVersion || 'emberjs/data#master'
  };

  promise = chainNodeModulesSetup(promise, setupOptions);

  if (usesBower) {
    promise = chainBowerSetup(promise, setupOptions);
  }

  // All dependencies should be installed, so symlink them into the app and
  // run the addon's blueprint to finish the app creation.
  return promise
    .then(() => linkDependencies(appName))
    .then(runAddonGenerator);
}

// Generates the arguments to pass to `ember new`. Optionally skipping the
// npm and/or bower installation phases.
function generateArgsForEmberNew(skipNpm, skipBower) {
  let extraOptions = [];

  if (skipNpm) {
    debug('skipping npm');
    extraOptions.push('--skip-npm');
  }

  if (skipBower) {
    debug('skipping bower');
    extraOptions.push('--skip-bower');
  }

  return extraOptions.concat(runCommandOptions);
}

function chainNodeModulesSetup(promise, options) {
  let { appName, emberDataVersion, emberVersion, hasNodeModules } = options;

  // Modifies the package.json to include correct versions of dependencies
  promise = promise
    .then(() => addEmberDataToDependencies(appName, emberDataVersion))
    .then(() => removeEmberSourceFromDependencies(appName, emberVersion));

  if (!hasNodeModules) {
    promise = promise
      .then(() => {
        debug('installing ember-disable-prototype-extensions');
        return runCommand('npm', 'install', 'ember-disable-prototype-extensions');
      })
      .then(() => {
        debug("installed ember-disable-prototype-extension");
        return runCommand('npm', 'install');
      })
      .then(() => debug('installed ember-data ' + emberDataVersion))
      .then(() => symlinkAddon(appName))
      .then(() => movePristineNodeModules(appName));
  }

  return promise.then(() => addAddonUnderTestToDependencies(appName));
}

function chainBowerSetup(promise, options) {
  let { appName, emberVersion, hasBowerComponents } = options;

  promise = promise
    .then(() => addEmberToBowerJSON(appName, emberVersion))
    .then(() => removeEmberDataFromBowerJSON(appName));

  if (!hasBowerComponents) {
    promise = promise
      .then(() => runCommand('bower', 'install'))
      .then(() => debug('installed ember ' + emberVersion))
      .then(() => movePristineBowerComponents(appName));
  }

  return promise;
}

function hasPristineNodeModules() {
  return existsSync(temp.pristineNodeModulesPath);
}

function hasPristineBowerComponents() {
  return existsSync(temp.pristineBowerComponentsPath);
}

function movePristineNodeModules(appName) {
  var nodeModulesPath = path.join(temp.pristinePath, appName, 'node_modules');
  moveDirectory(nodeModulesPath, temp.pristineNodeModulesPath);
}

function movePristineBowerComponents(appName) {
  var bowerComponentsPath = path.join(temp.pristinePath, appName, 'bower_components');
  moveDirectory(bowerComponentsPath, temp.pristineBowerComponentsPath);
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
  var bowerJSONPath = path.join(temp.pristinePath, appName, 'bower.json');
  var bowerJSON = fs.readJsonSync(bowerJSONPath);

  bowerJSON.resolutions = {
    "ember": version
  };

  bowerJSON.dependencies['ember'] = version;

  fs.writeJsonSync(bowerJSONPath, bowerJSON);
}

function removeEmberDataFromBowerJSON(appName) {
  var bowerJSONPath = path.join(temp.pristinePath, appName, 'bower.json');
  var bowerJSON = fs.readJsonSync(bowerJSONPath);

  delete bowerJSON.dependencies['ember-data'];

  fs.writeJsonSync(bowerJSONPath, bowerJSON);
}

function symlinkAddon(appName) {
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
}

function addEmberDataToDependencies(appName, version) {
  var packageJSONPath = path.join(temp.pristinePath, appName, 'package.json');

  debug('installing ember-data ' + version);

  var packageJSON = fs.readJsonSync(packageJSONPath);

  packageJSON.devDependencies['ember-data'] = version;

  fs.writeJsonSync('package.json', packageJSON);
}

function removeEmberSourceFromDependencies(appName, version) {
  var packageJSONPath = path.join(temp.pristinePath, appName, 'package.json');

  var packageJSON = fs.readJsonSync(packageJSONPath);

  // If we're not using bower, but the ember version is canary, we change it to
  // beta instead. This is because ember-source does not support canary releases.
  if (!usesBower && version === 'canary') {
    version = 'beta';
  }

  // If we're using canary, then it means we support bower, so we'll use ember
  // from bower instead and drop ember-source.
  if (version === 'canary' && packageJSON.devDependencies.hasOwnProperty('ember-source')) {
    debug('removing ember-source from NPM ');

    delete packageJSON.devDependencies['ember-source'];
    fs.writeJsonSync('package.json', packageJSON);
  }
}

function addAddonUnderTestToDependencies(appName) {
  var pkg = findAddonPackageJSON();
  var packageJSONPath = path.join(temp.pristinePath, appName, 'package.json');

  debug('installing %s as addon for application', pkg.name);

  // Read the current version of the FastBoot addon under test, then add that
  // to the Ember app's package.json.
  var packageJSON = fs.readJsonSync(packageJSONPath);

  packageJSON.devDependencies[pkg.name] = pkg.version;

  fs.writeJsonSync('package.json', packageJSON);
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
  let nodeModulesAppPath = path.join(temp.pristinePath, appName, 'node_modules');
  symlinkDirectory(temp.pristineNodeModulesPath, nodeModulesAppPath);

  if (usesBower) {
    let bowerComponentsAppPath = path.join(temp.pristinePath, appName, 'bower_components');
    symlinkDirectory(temp.pristineBowerComponentsPath, bowerComponentsAppPath);
  }
}
