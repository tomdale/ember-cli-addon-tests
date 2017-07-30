'use strict';

const RSVP     = require('rsvp');
const debug    = require('../utilities/debug');
const runEmber = require('../utilities/run-ember');
const defaults = require('lodash/defaults');
const temp     = require('../utilities/temp');

module.exports = function runServer(options) {
  return new RSVP.Promise(function(resolve, reject) {
    options = options || { };

    defaults(options, {
      port: '49741',
      command: 'server'
    });

    let args = [
      '--port', options.port
    ];

    if (options.additionalArguments) {
      args = args.concat(options.additionalArguments);
    }

    let commandOptions = {
      verbose: true,

      onOutput: function(output, child) {
        if (detectServerStart(output)) {
          resolve(child);
        }
      }
    };

    args.push(commandOptions);

    debug('starting server; command=%s; port=%s', options.command, options.port);

    runEmber(options.command, args, temp.pristineNodeModulesPath)
      .then(function() {
        throw new Error('The server should not have exited successfully.');
      })
      .catch(function(e) {
        reject(e);
      });
  });
};

function detectServerStart(output) {
  let indicators = [
    'Ember FastBoot running at',
    'Build successful'
  ];

  for (let i = 0; i < indicators.length; i++) {
    if (output.indexOf(indicators[i]) > -1) {
      return true;
    }
  }
}
