'use strict';

const path = require('path');
const findup = require('findup-sync');
const debug = require('../utilities/debug');
const copy = require('fs-extra').copy;

function findFixturesPath(fixturesPath) {
  fixturesPath = findup(fixturesPath || 'test/fixtures');

  if (!fixturesPath) {
    fixturesPath = findup('tests/fixtures');
  }

  if (!fixturesPath) {
    throw new Error('Could not find fixtures directory. Make sure you have a fixtures directory in your `test/` directory. You may encounter this issue if you have npm linked this package; copy it to your node_modules directory instead.');
  }

  return fixturesPath;
}

function copyFixtureFiles(appName, destDir, fixturesPath) {
  if (!fixturesPath || !path.isAbsolute(fixturesPath)) {
    fixturesPath = findFixturesPath(fixturesPath);
  }

  let sourceDir = path.join(fixturesPath, appName);

  debug('copying fixtures; from=%s; to=%s', sourceDir, destDir);

  return copy(sourceDir, destDir, {
    overwrite: true
  });
}

module.exports = copyFixtureFiles;
