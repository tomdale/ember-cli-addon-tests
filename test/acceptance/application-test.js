var path = require('path');
var expect = require('chai').expect;
var RSVP = require('rsvp');
var request = RSVP.denodeify(require('request'));
var AddonTestApp = require('../../lib').AddonTestApp;
var runEmber = require('../../lib/utilities/run-ember');
var makeTemp = require('temp').track();
var writeFile = RSVP.denodeify(require('fs').writeFile);

describe('Acceptance | application', function() {
  this.timeout(300000);

  var previousCwd;
  var app;

  before(function() {
    previousCwd = process.cwd();
    var tmp = makeTemp.mkdirSync();
    process.chdir(tmp);

    app = new AddonTestApp();

    return runEmber(
      'addon', ['my-addon', '-sb', '-sn', '-sg']
    ).then(function() {
      process.chdir(path.join(tmp, 'my-addon'));
      return writeFile(
        'tests/dummy/app/templates/application.hbs',
        'The dummy app is rendering correctly'
      );
    }).then(function() {
      return app.create('dummy', {
        fixturesPath: 'tests'
      });
    }).then(function() {
      return app.startServer();
    });
  });

  after(function() {
    process.chdir(previousCwd);

    return app.stopServer();
  });

  it('works', function() {
    return request('http://localhost:49741/assets/dummy.js')
      .then(function(response) {
        expect(response.body).to.contain('The dummy app is rendering correctly');
      });
  });
});
