'use strict';

const path       = require('path');
const existsSync = require('exists-sync');
const debug      = require('./debug');
const renameSync = require('fs-extra').renameSync;

/*
 * Moves a directory, but only if the target doesn't exist.
 */
module.exports = function moveDirectory(from, to) {
  from = path.resolve(from);

  if (!existsSync(to)) {
    debug('moving directory; from=' + from + '; to=' + to);
    renameSync(from, to);
  }
};
