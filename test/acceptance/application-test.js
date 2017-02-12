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
  this.timeout(300000);

  var previousCwd;
  var app;

  before(function() {
    previousCwd = process.cwd();
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
      app.editPackageJSON(function(pkg) {
        pkg.devDependencies['ember-cli-fastboot'] = process.env.npm_package_devDependencies_ember_cli_fastboot;
      });
      return app.run('npm', 'install');
    }).then(function() {
      return app.startServer({
        command: 'fastboot',
        additionalArguments: ['--serve-assets']
      });
    });
  });

  after(function() {
    process.chdir(previousCwd);

    return app.stopServer();
  });

  it('works', function() {
    return request('http://localhost:49741')
      .then(function(response) {
        expect(response.body).to.contain('my-addon is working');
      });
  });
});
