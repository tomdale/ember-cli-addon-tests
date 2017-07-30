'use strict';

const path = require('path');
const expect = require('chai').expect;
const RSVP = require('rsvp');
const request = RSVP.denodeify(require('request'));
const AddonTestApp = require('../../lib').AddonTestApp;
const runEmber = require('../../lib/utilities/run-ember');
const makeTemp = require('temp').track();
const copyFixtureFiles = require('../../lib/utilities/copy-fixture-files');
const fs = require('fs');
const copy = RSVP.denodeify(require('cpr'));

function promoteHtmlbars() {
  let pkg = fs.readFileSync('package.json');
  pkg = JSON.parse(pkg);
  pkg.dependencies['ember-cli-htmlbars'] = pkg.devDependencies['ember-cli-htmlbars'];
  delete pkg.devDependencies['ember-cli-htmlbars'];
  pkg = JSON.stringify(pkg);
  fs.writeFileSync('package.json', pkg);
}

describe('Acceptance | application', function() {
  this.timeout(process.platform === 'win32' ? 500000 : 300000);

  let app;

  before(function() {
    let previousCwd = process.cwd();
    let tmp = makeTemp.mkdirSync();
    process.chdir(tmp);

    app = new AddonTestApp();

    let addonName = 'my-addon';
    let addonPath = path.join(tmp, addonName);

    return runEmber(
      'addon', [addonName, '-sb', '-sn', '-sg']
    ).then(function() {
      process.chdir(previousCwd);
      return copyFixtureFiles(addonName, addonPath);
    }).then(function() {
      process.chdir(addonPath);

      promoteHtmlbars();

      return app.create('dummy', {
        fixturesPath: 'tests'
      });
    }).then(function() {
      process.chdir(previousCwd);
    }).then(function() {
      return copy(
        path.join(__dirname, '../fixtures/random-template.hbs'),
        path.join(app.path, 'app/templates/random-template.hbs')
      );
    }).then(function() {
      app.editPackageJSON(function(pkg) {
        pkg.devDependencies['ember-cli-fastboot'] = process.env.npm_package_devDependencies_ember_cli_fastboot;
      });
      return app.run('npm', 'install');
    });
  });

  beforeEach(function() {
    return app.startServer();
  });

  afterEach(function() {
    return app.stopServer();
  });

  it('works', function() {
    return request({
      url: 'http://localhost:49741',
      headers: {
        // We have to send the `Accept` header so the ember-cli server sees this as a request to `index.html` and sets
        // `req.serveUrl`, that ember-cli-fastboot needs in its middleware
        // See https://github.com/ember-cli/ember-cli/blob/86a903f/lib/tasks/server/middleware/history-support/index.js#L55
        // and https://github.com/ember-fastboot/ember-cli-fastboot/blob/28213e0/index.js#L160
        'Accept': 'text/html'
      }
    })
      .then(function(response) {
        expect(response.body).to.contain('my-addon is working');
      });
  });

  it('can run a second one right after the first on the same port (assert port cleanup)', function() {
    return request({
      url: 'http://localhost:49741',
      headers: {
        'Accept': 'text/html'
      }
    })
      .then(function(response) {
        expect(response.body).to.contain('my-addon is working');
      });
  });

  it('exposes `app.path` for manual fixture copying', function() {
    return request('http://localhost:49741/assets/dummy.js')
      .then(function(response) {
        expect(response.body).to.contain('random template');
      });
  });
});
