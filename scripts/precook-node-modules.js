"use strict";

var temp             = require('temp').track();
var path             = require('path');
var fs               = require('fs-promise');
var readJsonSync     = require('fs-extra').readJsonSync;
var findup           = require('findup-sync');

var moveDirectory    = require('../lib/utilities/move-directory');
var runNew           = require('../lib/utilities/run-new');
var symlinkDirectory = require('../lib/utilities/symlink-directory');

var tmpDir           = temp.mkdirSync();
var root             = process.cwd();
var appName          = 'precooked-app';

var pkg = findup('package.json');
var name = readJsonSync(pkg).name;

fs.ensureDir('tmp')
  .then(function() {
    process.chdir(tmpDir);
    return runNew(appName);
  })
  .then(function() {
    var precooked = path.join(root, 'tmp', 'precooked_node_modules');
    moveDirectory(path.join(tmpDir, appName, 'node_modules'), precooked);
    symlinkDirectory(root, path.join(precooked, name));
  })
  .catch(function(e) {
    console.log(e); // eslint-disable-line no-console
  });
