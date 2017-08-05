/* eslint-env node */
module.exports = {
  normalizeEntityName() {
    // this should fail if dependencies aren't installed
    require('broccoli-asset-rev');
  }
};
