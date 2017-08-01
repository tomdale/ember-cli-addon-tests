# Ember CLI Addon Tests

[![Greenkeeper badge](https://badges.greenkeeper.io/tomdale/ember-cli-addon-tests.svg)](https://greenkeeper.io/)
[![npm version](https://badge.fury.io/js/ember-cli-addon-tests.svg)](https://badge.fury.io/js/ember-cli-addon-tests)
[![Build Status - Travis](https://travis-ci.org/tomdale/ember-cli-addon-tests.svg?branch=master)](https://travis-ci.org/tomdale/ember-cli-addon-tests)
[![Build Status - AppVeyor](https://ci.appveyor.com/api/projects/status/ifp893hf5s6j5uuy/branch/master?svg=true)](https://ci.appveyor.com/project/tomdale/ember-cli-addon-tests/branch/master)

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

## Installation

```sh
npm install ember-cli-addon-tests --save-dev
```

## Example

```js
'use strict';

const expect = require('chai').expect;
const denodeify = require('denodeify');
const request = denodeify(require('request'));
const AddonTestApp = require('ember-cli-addon-tests').AddonTestApp;

describe('serve assets acceptance', function() {
  this.timeout(300000);

  let app;

  before(function() {
    app = new AddonTestApp();

    return app.create('dummy')
      .then(() => {
        return app.startServer();
      });
  });

  after(function() {
    return app.stopServer();
  });

  it('/index.html', function() {
    return request({
      url: 'http://localhost:49741',
      headers: {
        'Accept': 'text/html'
      }
    })
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.headers["content-type"]).to.eq("text/html");
        expect(response.body).to.contain("<body>");
      });
  });

  it('/assets/vendor.js', function() {
    return request('http://localhost:49741/assets/vendor.js')
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.headers["content-type"]).to.eq("application/javascript");
        expect(response.body).to.contain("Ember =");
      });
  });

  it('/assets/dummy.js', function() {
    return request('http://localhost:49741/assets/dummy.js')
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.headers["content-type"]).to.eq("application/javascript");
        expect(response.body).to.contain("this.route('posts')");
      });
  });
});
```

See the [ember-cli-fastboot tests](https://github.com/ember-fastboot/ember-cli-fastboot/tree/master/test)
for real world examples.

## Defining a New App

Creates a new app for testing.

```js
const AddonTestApp = require('ember-cli-addon-tests').AddonTestApp;
app = new AddonTestApp();
```

## Creating the App

This starts the process of actually creating a new Ember CLI app on
disk. The first run may take several minutes while the `npm install`
happens. Subsequent runs will be faster. Pass the name of the
application as the first argument.

```js
// returns a promise
app.create('my-app');
```

### "Precooking" Node Modules

You can "precook" (essentially pre-install) the node modules for the test
applications by using `scripts/precook-node-modules.js`. This will speed up
test runs by configuring a `node_modules` directory that will be reused.

### Options

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
| noFixtures       | Disables the use of fixture files                                                       | false               |


### Fixtures

You will probably want to add files to the Ember application that you
want to test your addon with. Ember CLI Addon Tests will automatically
copy fixtures on top of the base Ember CLI app, based on the name of the
application that you created.

For example, if you call `app.create('my-app')`, the test helper will
look for a file called `test/fixtures/my-app` in your addon's directory
and will copy them to the test app, overwriting any files that exist.

If you do not need fixture files in your test, you can disable them by
specifying the `noFixtures` option.

Once the promise resolves, you can inspect the temporary location of the
app under test via `app.path`:

```js
app.create('my-app').then(() => {
  console.log(app.path);
  // /var/folders/vc/wjjhq0f542q3dn2109clfy81dlk662/T/d-117613-7500-1bq89dh.8ts6wuq5mi/under-test/my-app
  // or
  // C:\Users\kelly\AppData\Local\Temp\d-117613-15884-1j1bw40.5kbh\under-test\my-app
});
```

## Editing App's `package.json`

If your addon depends on end developers configuring their application's
`package.json`, you can edit the test app's `package.json` with the
`editPackageJSON` method:

```js
// runs synchronously
app.editPackageJSON(pkg => {
  pkg.devDependencies['fake-addon'] = "*";
  pkg.devDependencies['fake-addon-2'] = "*";
});
```

You should not call `app.editPackageJSON()` until after the `create()`
promise has resolved.

## Starting the Server

To test the assets served by Ember CLI, you can start the server (i.e.,
`ember serve`) via the `startServer()` method:

```js
// returns a promise
app.startServer();
```

You can also pass additional command line arguments via the
`additionalArguments` option:

```js
// equivalent to `ember serve --production`
app.startServer({
  additionalArguments: ['--production']
});
```

You can run your own command like `ember foo` instead of `ember serve`.
Then you need to tell it what to look for in the console to know it is ready.:

```js
app.startServer({
  command: 'foo',
  detectServerStart(output) {
    return output.indexOf('foo is ready') > -1;
  }
});
```

## Stopping the Server

After your tests, stop the development server via `stopServer()`.

```js
app.stopServer();
```

## Running Commands

You can run arbitrary commands inside the test app via the `run()`
method. Takes a command and optional arguments.

```js
// returns a promise
app.run('ember', 'build', '--verbose');
```

## Running Ember CLI Commands

You can run commands using the app's version of Ember CLI via the
`runEmberCommand` method:

```js
// equivalent to `ember build --environment production`
app.runEmberCommand('build', '--environment', 'production');
```

## Cleanup

Temporary directories are automatically deleted once the process exits.
