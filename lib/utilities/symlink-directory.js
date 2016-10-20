var symlinkOrCopySync = require('symlink-or-copy').sync;
var debug             = require('./debug');
var path              = require('path');

module.exports = function (from, to) {
  debug("symlinking; from=" + from + "; to=" + path.resolve(to));
  symlinkOrCopySync(from, to);
};
