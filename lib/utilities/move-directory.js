'use strict';

const path = require('path');
const debug = require('./debug');
const fs = require('fs-extra');

/*
 * Moves a directory, but only if the target doesn't exist.
 */
module.exports = function moveDirectory(from, to) {
  from = path.resolve(from);

  if (!fs.existsSync(to)) {
    debug('moving directory; from=' + from + '; to=' + to);
    fs.renameSync(from, to);
  }
};
