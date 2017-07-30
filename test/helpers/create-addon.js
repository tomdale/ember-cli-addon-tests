'use strict';

const path = require('path');
const runEmber = require('../../lib/utilities/run-ember');
const makeTemp = require('temp').track();
const copyFixtureFiles = require('../../lib/utilities/copy-fixture-files');
const fs = require('fs-extra');

function promoteHtmlbars() {
  let pkg = fs.readJsonSync('package.json');
  pkg.dependencies['ember-cli-htmlbars'] = pkg.devDependencies['ember-cli-htmlbars'];
  delete pkg.devDependencies['ember-cli-htmlbars'];
  fs.writeJsonSync('package.json', pkg);
}

const addonName = 'my-addon';

module.exports = function(createApp) {
  let previousCwd = process.cwd();
  let tmp = makeTemp.mkdirSync();
  process.chdir(tmp);

  let addonPath = path.join(tmp, addonName);

  return runEmber(
    'addon', [addonName, '-sb', '-sn', '-sg']
  ).then(() => {
    process.chdir(previousCwd);
    return copyFixtureFiles(addonName, addonPath);
  }).then(() => {
    process.chdir(addonPath);

    promoteHtmlbars();

    return createApp();
  }).then(() => {
    process.chdir(previousCwd);
  });
};
