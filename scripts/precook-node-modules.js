"use strict";

var temp             = require('temp').track();
var path             = require('path');
var fs               = require('fs-promise');

var moveDirectory    = require('../lib/utilities/move-directory');
var runCommand       = require('../lib/utilities/run-command');
var symlinkDirectory = require('../lib/utilities/symlink-directory');

var tmpDir           = temp.mkdirSync();
var root             = process.cwd();
var name             = 'precooked-app';
var args             = [path.join(__dirname, '../node_modules/ember-cli/', 'bin', 'ember'), 'new', '--disable-analytics', '--watcher = node', '--skip-git', name];

fs.ensureDir('tmp')
  .then(function() {
    process.chdir(tmpDir);
    return runCommand.apply(undefined, args);
  })
  .then(function() {
    moveDirectory(path.join(tmpDir, name, 'node_modules'), path.join(root, 'tmp', 'precooked_node_modules'));
    symlinkDirectory(root, path.join(root, 'tmp', 'precooked_node_modules', 'ember-cli-fastboot'));
  })
  .catch(function(e) {
    console.log(e);
  });
