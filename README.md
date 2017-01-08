## Ember CLI Addon Tests

[![Build Status](https://travis-ci.org/tomdale/ember-cli-addon-tests.svg?branch=master)](https://travis-ci.org/tomdale/ember-cli-addon-tests)

Test helpers for testing Ember CLI addons inside the context of a real
Ember app.

Previously, it was difficult to do real integration testing with Ember
CLI addons because the process of creating a new Ember app is very slow, due
to the required `npm install` and `bower install` steps.

This package automates the process of creating a new Ember CLI app and
caching its npm and Bower dependencies, so each test run can get a fresh
app in very little time. Best of all, you'll be testing your addon in a
real app so you can catch integration issues early.

**Stability Note**: API likely to change

### Installation

```sh
npm install ember-cli-addon-tests --save-dev
```

### Example

```js
var expect = require('chai').expect;
var RSVP = require('rsvp');
var request = RSVP.denodeify(require('request'));
var AddonTestApp = require('ember-cli-addon-tests').AddonTestApp;

describe('serve assets acceptance', function() {
  this.timeout(300000);

  var app;

  before(function() {

    app = new AddonTestApp();

    return app.create('dummy')
      .then(function() {
        return app.startServer({
          command: 'fastboot',
          additionalArguments: ['--serve-assets']
        });
      });
  });

  after(function() {
    return app.stopServer();
  });

  it('/assets/vendor.js', function() {
    return request('http://localhost:49741/assets/vendor.js')
      .then(function(response) {
        expect(response.statusCode).to.equal(200);
        expect(response.headers["content-type"]).to.eq("application/javascript");
        expect(response.body).to.contain("Ember =");
      });
  });

  it('/assets/dummy.js', function() {
    return request('http://localhost:49741/assets/dummy.js')
      .then(function(response) {
        expect(response.statusCode).to.equal(200);
        expect(response.headers["content-type"]).to.eq("application/javascript");
        expect(response.body).to.contain("this.route('posts')");
      });
  });
});
```

See the [ember-cli-fastboot tests](https://github.com/ember-fastboot/ember-cli-fastboot/tree/master/test)
for real world examples.

### Defining a New App

Creates a new app for testing.

```js
var AddonTestApp = require('ember-cli-addon-tests').AddonTestApp;
app = new AddonTestApp();
```

### Creating the App

This starts the process of actually creating a new Ember CLI app on
disk. The first run may take several minutes while the `npm install`
happens. Subsequent runs will be faster. Pass the name of the
application as the first argument.

```js
// returns a promise
app.create('my-app');
```

#### Options

You can customize the app by supplying an options hash:

```js
// returns a promise
app.create('my-app', {
  emberVersion: 'release'
});
```

The following options exist: 
 
| option           | description                                                                             | defaults to         |
|------------------|-----------------------------------------------------------------------------------------|---------------------|
| emberVersion     | Set the ember version the app should be created with, as you would in your `bower.json` | canary              |
| emberDataVersion | Set the version of ember-data, as you would in your `package.json`                      | emberjs/data#master |
| fixturesPath     | The path to look for your fixture files (see below)                                     | test/fixtures       |


#### Fixtures

You will probably want to add files to the Ember application that you
want to test your addon with. Ember CLI Addon Tests will automatically
copy fixtures on top of the base Ember CLI app, based on the name of the
application that you created.

For example, if you call `app.create('my-app')`, the test helper will
look for a file called `test/fixtures/my-app` in your addon's directory
and will copy them to the test app, overwriting any files that exist.

### Editing App's `package.json`

If your addon depends on end developers configuring their application's
`package.json`, you can edit the test app's `package.json` with the
`editPackageJSON` method:

```js
// runs synchronously
app.editPackageJSON(function(pkg) {
  pkg['devDependencies']['fake-addon'] = "*";
  pkg['devDependencies']['fake-addon-2'] = "*";
});
```

You should not call `app.editPackageJSON()` until after the `create()`
promise has resolved.

### Starting the Server

To test the assets served by Ember CLI, you can start the server (i.e.,
`ember server`) via the `startServer()` method:

```js
// returns a promise
app.startServer();
```

If you want to run a different command that starts the server, you can
pass the `command` option:
```js
// Runs `ember fastboot` inside the app instead of `ember server`
app.startServer({
  command: 'fastboot'
});
```

You can also pass additional command line arguments via the
`additionalArguments` option:

```js
// equivalent to `ember server --serve-assets`
app.startServer({
  additionalArguments: ['--serve-assets']
});
```

### Stopping the Server

After your tests, stop the development server via `stopServer()`.

```js
app.stopServer();
```

### Running Commands

You can rub arbitrary commands inside the test app via the `run()`
method. Takes a command and optional arguments.

```js
// returns a promise
app.run('ember', 'build', '--verbose');
```

### Running Ember CLI Commands

You can run commands using the app's version of Ember CLI via the
`runEmberCommand` method:

```js
// equivalent to `ember fastboot:build --environment production`
app.runEmberCommand('fastboot:build', '--environment', 'production');
```

### Cleanup

Temporary directories are automatically deleted once the process exits.
