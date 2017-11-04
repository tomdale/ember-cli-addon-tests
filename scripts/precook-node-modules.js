'use strict';

const temp             = require('temp').track();
const path             = require('path');
const fs               = require('fs-extra');
const findup           = require('findup-sync');

const moveDirectory    = require('../lib/utilities/move-directory');
const runNew           = require('../lib/utilities/run-new');
const symlinkDirectory = require('../lib/utilities/symlink-directory');

const tmpDir           = temp.mkdirSync();
const root             = process.cwd();
const appName          = 'precooked-app';

const pkg = findup('package.json');
const name = fs.readJsonSync(pkg).name;

fs.ensureDir('tmp')
  .then(() => {
    process.chdir(tmpDir);
    return runNew(appName);
  })
  .then(() => {
    let precooked = path.join(root, 'tmp', 'precooked_node_modules', 'node_modules');
    fs.mkdirSync(path.dirname(precooked));
    moveDirectory(path.join(tmpDir, appName, 'node_modules'), precooked);
    symlinkDirectory(root, path.join(precooked, name));
  })
  .catch((e) => {
    console.log(e); // eslint-disable-line no-console
  });
