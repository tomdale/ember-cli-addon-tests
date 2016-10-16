var path = require('path');
var expect = require('chai').expect;
var RSVP = require('rsvp');
var request = RSVP.denodeify(require('request'));
var AddonTestApp = require('../../lib').AddonTestApp;

describe('Acceptance | application', function() {
  this.timeout(300000);

  var previousCwd;
  var app;

  before(function() {
    previousCwd = process.cwd();
    process.chdir('test/fixtures/my-addon');

    app = new AddonTestApp();

    return app.create('dummy', {
      fixturesPath: 'test/fixtures/my-addon/tests'
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
