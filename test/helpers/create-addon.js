'use strict';

const path = require('path');
const makeTemp = require('temp').track();
const copyFixtureFiles = require('../../lib/utilities/copy-fixture-files');
const fs = require('fs-extra');

const addonName = 'my-addon';

module.exports = function(createApp) {
  let previousCwd = process.cwd();
  let tmp = makeTemp.mkdirSync();
  let addonPath = path.join(tmp, addonName);

  fs.ensureDirSync(addonPath);

  return copyFixtureFiles(addonName, addonPath)
    .then(() => {
      process.chdir(addonPath);

      return createApp();
    }).then(() => {
      process.chdir(previousCwd);
    });
};
