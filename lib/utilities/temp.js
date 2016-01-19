var fs       = require('fs-extra');
var path     = require('path');
var makeTemp = require('temp').track();

var symlinkDirectory = require('./symlink-directory');
var debug            = require('./debug');

var temp = module.exports = {
  path: null,
  pristinePath: null,
  pristineNodeModulesPath: null,
  pristineBowerComponentsPath: null,
  underTestPath: null,

  ensureCreated: ensureCreated
};

// Creates a temp directory outside the project for creating new Ember CLI
// apps in. (New apps cannot be created in the project directory because it is itself
// an Ember app and Ember CLI doesn't like that).
//
// Once created, this function creates two directories:
//
//   - `pristine`
//   - `under-test`
//
// `pristine` is used to store pristine versions of apps, as well as for caching
// `node_modules` and `bower_components` directories. As multiple tests get run,
// the `pristine` directory is used as a cache to avoid expensive operations such
// as `ember new` and `npm install`.
//
// `under-test` is the directory where the app being tested by the current acceptance
// test goes. At the beginning of the test, the app is copied from `pristine` to
// `under-test`.

function ensureCreated() {
  if (temp.path) { return temp.path; }

  temp.path = makeTemp.mkdirSync();

  temp.pristinePath = path.join(temp.path, 'pristine');
  temp.pristineNodeModulesPath = path.join(temp.pristinePath, 'node_modules');
  temp.pristineBowerComponentsPath = path.join(temp.pristinePath, 'bower_components');

  temp.underTestPath = path.join(temp.path, 'under-test');

  fs.mkdirsSync(temp.pristinePath);
  fs.mkdirsSync(temp.underTestPath);

  debug("created tmp; path=" + temp.path);

  // To speed up test runs, use the project's `tmp/precooked_node_modules` directory
  // if it exists.
  symlinkPrecookedNodeModules();

  return temp.path;
}

// If the user has supplied a `tmp/precooked_node_modules` directory, that is symlinked
// into the `pristine` directory before an app is created. That will be used rather than
// having `ember new` do an `npm install`, saving significant time.
function symlinkPrecookedNodeModules() {
  var precookedNodeModulesPath = path.join(process.cwd(), 'tmp', 'precooked_node_modules');

  // If the user running the tests has provided a "precooked" node_modules directory to be used
  // by an Ember app, we use that as the pristine version instead of running `npm install`. This
  // greatly reduces the time tests take to run.
  if (fs.existsSync(precookedNodeModulesPath)) {
    debug('symlinking precooked node_modules; path=' + precookedNodeModulesPath);
    symlinkDirectory(precookedNodeModulesPath, temp.pristineNodeModulesPath);
  } else {
    debug('no precooked node_modules');
  }
}

