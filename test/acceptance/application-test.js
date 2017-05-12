var path = require('path');
var expect = require('chai').expect;
var RSVP = require('rsvp');
var request = RSVP.denodeify(require('request'));
var AddonTestApp = require('../../lib').AddonTestApp;
var runEmber = require('../../lib/utilities/run-ember');
var makeTemp = require('temp').track();
var copyFixtureFiles = require('../../lib/utilities/copy-fixture-files');
var fs = require('fs');

function promoteHtmlbars() {
  var pkg = fs.readFileSync('package.json');
  pkg = JSON.parse(pkg);
  pkg.dependencies['ember-cli-htmlbars'] = pkg.devDependencies['ember-cli-htmlbars'];
  delete pkg.devDependencies['ember-cli-htmlbars'];
  pkg = JSON.stringify(pkg);
  fs.writeFileSync('package.json', pkg);
}

describe('Acceptance | application', function() {
  this.timeout(process.platform === 'win32' ? 500000 : 300000);

  var app;

  before(function() {
    var previousCwd = process.cwd();
    var tmp = makeTemp.mkdirSync();
    process.chdir(tmp);

    app = new AddonTestApp();

    var addonName = 'my-addon';
    var addonPath = path.join(tmp, addonName);

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
});
