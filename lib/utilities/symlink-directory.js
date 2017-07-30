'use strict';

const symlinkOrCopySync = require('symlink-or-copy').sync;
const debug             = require('./debug');
const path              = require('path');

module.exports = function(from, to) {
  debug('symlinking; from=' + from + '; to=' + path.resolve(to));
  symlinkOrCopySync(from, to);
};
