'use strict';

const expect = require('chai').expect;
const RSVP = require('rsvp');
const request = RSVP.denodeify(require('request'));
const AddonTestApp = require('../../lib').AddonTestApp;
const createAddon = require('../helpers/create-addon');

describe('Acceptance | simple', function() {
  this.timeout(process.platform === 'win32' ? 500000 : 300000);

  let app;

  before(function() {
    app = new AddonTestApp();

    return createAddon(() => {
      return app.create('dummy', {
        fixturesPath: 'tests'
      });
    });
  });

  beforeEach(function() {
    return app.startServer();
  });

  afterEach(function() {
    return app.stopServer();
  });

  it('works', function() {
    return request('http://localhost:49741/assets/vendor.js')
      .then(response => {
        expect(response.body).to.contain('my-addon is working');
      });
  });
});
