"use strict";

var temp             = require('temp').track();
var path             = require('path');
var fs               = require('fs-promise');

var moveDirectory    = require('../lib/utilities/move-directory');
var runNew           = require('../lib/utilities/run-new');
var symlinkDirectory = require('../lib/utilities/symlink-directory');

var tmpDir           = temp.mkdirSync();
var root             = process.cwd();
var name             = 'precooked-app';

fs.ensureDir('tmp')
  .then(function() {
    process.chdir(tmpDir);
    return runNew(name);
  })
  .then(function() {
    var precooked = path.join(root, 'tmp', 'precooked_node_modules');
    moveDirectory(path.join(tmpDir, name, 'node_modules'), precooked);
    symlinkDirectory(root, path.join(precooked, 'ember-cli-fastboot'));
  })
  .catch(function(e) {
    console.log(e);
  });
