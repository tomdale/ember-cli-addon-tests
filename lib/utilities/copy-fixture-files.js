var path = require('path');
var findup = require('findup-sync');
var debug = require('../utilities/debug');
var RSVP = require('rsvp');
var copy = RSVP.denodeify(require('cpr'));

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

module.exports = copyFixtureFiles;