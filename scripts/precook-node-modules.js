'use strict';

const temp             = require('temp').track();
const path             = require('path');
const fs               = require('fs-promise');
const readJsonSync     = require('fs-extra').readJsonSync;
const findup           = require('findup-sync');

const moveDirectory    = require('../lib/utilities/move-directory');
const runNew           = require('../lib/utilities/run-new');
const symlinkDirectory = require('../lib/utilities/symlink-directory');

const tmpDir           = temp.mkdirSync();
const root             = process.cwd();
const appName          = 'precooked-app';

const pkg = findup('package.json');
const name = readJsonSync(pkg).name;

fs.ensureDir('tmp')
  .then(function() {
    process.chdir(tmpDir);
    return runNew(appName);
  })
  .then(function() {
    let precooked = path.join(root, 'tmp', 'precooked_node_modules');
    moveDirectory(path.join(tmpDir, appName, 'node_modules'), precooked);
    symlinkDirectory(root, path.join(precooked, name));
  })
  .catch(function(e) {
    console.log(e); // eslint-disable-line no-console
  });
