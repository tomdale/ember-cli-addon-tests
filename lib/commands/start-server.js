'use strict';

const debug    = require('../utilities/debug');
const runEmber = require('../utilities/run-ember');
const defaults = require('lodash/defaults');
const temp     = require('../utilities/temp');

module.exports = function runServer(options) {
  return new Promise((resolve, reject) => {
    options = options || { };

    defaults(options, {
      port: '49741',
      command: 'server',
      detectServerStart
    });

    let args = [
      '--port', options.port
    ];

    if (options.additionalArguments) {
      args = args.concat(options.additionalArguments);
    }

    let longRunningServerPromise;

    let commandOptions = {
      verbose: true,

      onOutput(output, child) {
        if (options.detectServerStart(output)) {
          resolve({
            server: child,
            longRunningServerPromise
          });
        }
      }
    };

    args.push(commandOptions);

    debug('starting server; command=%s; port=%s', options.command, options.port);

    longRunningServerPromise = runEmber(options.command, args, temp.pristineNodeModulesPath)
      .then(() => {
        throw new Error('The server should not have exited successfully.');
      })
      .catch(reject);
  });
};

function detectServerStart(output) {
  let indicators = [
    'Ember FastBoot running at',
    'Build successful'
  ];

  for (let indicator of indicators) {
    if (output.indexOf(indicator) > -1) {
      return true;
    }
  }
}
